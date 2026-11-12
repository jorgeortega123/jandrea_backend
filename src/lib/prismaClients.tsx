import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";

/**
 * UN PrismaClient por isolate (por binding D1), reutilizado entre peticiones.
 *
 * Antes se creaba `new PrismaClient()` en CADA petición (y varias veces por
 * petición en algunas rutas). Cada instancia instancia el motor WASM de
 * Prisma; con peticiones concurrentes en el mismo isolate se acumulaban
 * motores en memoria y fallaba la instanciación (Workers logs:
 * `Rt.loadEngine → instantiateLibrary → Uint8Array.subarray`) → 500 en
 * todos los endpoints.
 *
 * Con D1 la "conexión" es el binding del Worker (no un socket ligado a la
 * petición), así que compartir el cliente entre peticiones es seguro.
 *
 * Vigilancia (11-nov-2026): el cliente compartido se quedó atascado en
 * producción. Toda consulta quedaba esperando para siempre (CPU 0 ms) aunque
 * D1 respondía en < 1 ms, y como la promesa nunca fallaba el isolate no se
 * recuperaba solo. Ahora el arranque y cada operación tienen un tiempo
 * máximo: si se supera, el cliente se descarta (la siguiente petición crea
 * uno nuevo) y la petición falla con PrismaTimeoutError → 503 en vez de
 * colgarse.
 */

const CONNECT_TIMEOUT_MS = 8_000;
const QUERY_TIMEOUT_MS = 8_000;

export class PrismaTimeoutError extends Error {
  readonly code = "PRISMA_TIMEOUT";
  constructor(label: string, ms: number) {
    super(`Prisma no respondió en ${ms} ms (${label})`);
    this.name = "PrismaTimeoutError";
  }
}

export const isPrismaTimeout = (e: unknown): e is PrismaTimeoutError =>
  e instanceof PrismaTimeoutError;

function withTimeout<T>(work: PromiseLike<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new PrismaTimeoutError(label, ms)), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

type Entry = {
  client: PrismaClient;
  ready?: Promise<PrismaClient>;
  createdAt: number;
};

const entries = new WeakMap<D1Database, Entry>();

/** Saca del caché el cliente atascado (solo si sigue siendo el vigente). */
function discard(db: D1Database, entry: Entry, reason: string) {
  if (entries.get(db) !== entry) return;
  entries.delete(db);
  console.error(
    `[Prisma] cliente descartado tras ${Math.round((Date.now() - entry.createdAt) / 1000)} s de vida: ${reason}`
  );
}

function createEntry(db: D1Database): Entry {
  const entry = { createdAt: Date.now() } as Entry;
  const base = new PrismaClient({ adapter: new PrismaD1(db) });
  entry.client = base.$extends({
    query: {
      async $allOperations({ model, operation, args, query }) {
        try {
          return await withTimeout(
            query(args),
            QUERY_TIMEOUT_MS,
            `${model ? `${model}.` : ""}${operation}`
          );
        } catch (error) {
          if (isPrismaTimeout(error)) discard(db, entry, error.message);
          throw error;
        }
      },
    },
  }) as unknown as PrismaClient;
  return entry;
}

function getEntry(db: D1Database): Entry {
  let entry = entries.get(db);
  if (!entry) {
    entry = createEntry(db);
    entries.set(db, entry);
  }
  return entry;
}

/** Cliente compartido (síncrono). El motor arranca en la primera consulta. */
export function getPrismaClient(db: D1Database): PrismaClient {
  return getEntry(db).client;
}

const prismaClients = {
  /**
   * Cliente compartido con el motor ya iniciado. Si el arranque falla o no
   * termina a tiempo, se descarta para que la siguiente petición lo reintente
   * con uno nuevo (un motor que falló al instanciar no se recupera solo).
   */
  async fetch(db: D1Database): Promise<PrismaClient> {
    const entry = getEntry(db);
    if (!entry.ready) {
      const prisma = entry.client;
      entry.ready = withTimeout(prisma.$connect(), CONNECT_TIMEOUT_MS, "$connect").then(
        () => prisma
      );
      entry.ready.catch((error) =>
        discard(db, entry, error?.message || String(error))
      );
    }
    return entry.ready;
  },
};

export default prismaClients;
