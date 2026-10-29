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
 */
const clients = new WeakMap<D1Database, PrismaClient>();
const ready = new WeakMap<D1Database, Promise<PrismaClient>>();

/** Cliente compartido (síncrono). El motor arranca en la primera consulta. */
export function getPrismaClient(db: D1Database): PrismaClient {
  let prisma = clients.get(db);
  if (!prisma) {
    prisma = new PrismaClient({ adapter: new PrismaD1(db) });
    clients.set(db, prisma);
  }
  return prisma;
}

const prismaClients = {
  /**
   * Cliente compartido con el motor ya iniciado. Si el arranque falla, se
   * descarta para que la siguiente petición lo reintente con uno nuevo (un
   * motor que falló al instanciar no se recupera solo).
   */
  async fetch(db: D1Database): Promise<PrismaClient> {
    let promise = ready.get(db);
    if (!promise) {
      const prisma = getPrismaClient(db);
      promise = prisma.$connect().then(() => prisma);
      ready.set(db, promise);
      promise.catch(() => {
        ready.delete(db);
        clients.delete(db);
      });
    }
    return promise;
  },
};

export default prismaClients;
