import { Bindings } from "../../types/types";

/**
 * Estado REAL del aviso por correo, por destinatario.
 *
 *   EN_COLA       Cloudflare aceptó el envío; aún no hay resultado de entrega
 *   ENTREGADO     el servidor de correo del destinatario lo aceptó
 *   FALLIDO       Cloudflare registró un rebote, rechazo o fallo de entrega
 *   SIN_REGISTRO  aceptado hace tiempo, pero Cloudflare no registra este destinatario
 *   ERROR         Cloudflare rechazó el envío (nunca salió)
 *   OMITIDO       confirmación al cliente no enviada a propósito (límite anti-abuso)
 *
 * La entrega se lee de los eventos de Cloudflare (GraphQL), los mismos datos que
 * el registro de actividad del panel. Hay que mirar DOS datasets: según el
 * destinatario, el mismo tipo de envío aparece en `emailSendingAdaptive` o solo
 * en `emailRoutingAdaptive` (eventType "newEmail", visto en producción con
 * jandrea593ec@gmail.com). Mirar uno solo daría falsos "sin registro".
 */
export type EntregaStatus =
  | "EN_COLA"
  | "ENTREGADO"
  | "FALLIDO"
  | "SIN_REGISTRO"
  | "ERROR"
  | "OMITIDO";

/** CLIENTE: "tu solicitud se está procesando". EQUIPO: "nuevo cliente solicitó proforma". */
export type EntregaTipo = "CLIENTE" | "EQUIPO";

export interface Destino {
  tipo: EntregaTipo;
  to: string;
}

export const entregaKey = (e: { tipo?: EntregaTipo; to: string }) =>
  `${e.tipo ?? "EQUIPO"}:${e.to}`;

export interface EmailEntrega {
  tipo?: EntregaTipo;
  to: string;
  status: EntregaStatus;
  messageId: string | null;
  /** Cuándo Cloudflare aceptó el envío. */
  acceptedAt: string | null;
  /** Último cambio de estado conocido. */
  at: string | null;
  detail: string | null;
}

export type LeadEmailStatus = "PENDIENTE" | "EN_COLA" | "ENTREGADO" | "PARCIAL" | "ERROR";
export type Seguimiento = "activo" | "sin_configurar" | "error";

export interface EmailEvent {
  datetime: string;
  messageId: string;
  envelopeTo: string;
  status: string;
  errorCause?: string | null;
  errorDetail?: string | null;
}

/** Sin eventos pasado este tiempo, se avisa en vez de seguir diciendo "en cola". */
const SIN_REGISTRO_MS = 15 * 60 * 1000;
/** No se sigue consultando después de esto (Cloudflare guarda 31 días). */
const SEGUIMIENTO_MS = 7 * 24 * 60 * 60 * 1000;

export const parseEntregas = (json: string | null | undefined): EmailEntrega[] => {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

/** Resumen de la solicitud a partir de sus destinatarios. */
export function resumenEntregas(todas: EmailEntrega[]): LeadEmailStatus {
  const entregas = todas.filter((e) => e.status !== "OMITIDO");
  if (!entregas.length) return "PENDIENTE";
  const count = (...s: EntregaStatus[]) => entregas.filter((e) => s.includes(e.status)).length;
  if (count("ENTREGADO") === entregas.length) return "ENTREGADO";
  if (count("FALLIDO", "ERROR", "SIN_REGISTRO") === 0) return "EN_COLA";
  if (count("FALLIDO", "ERROR") === entregas.length) return "ERROR";
  return "PARCIAL";
}

export const errorDeEntregas = (entregas: EmailEntrega[]) => {
  const malas = entregas.filter((e) => e.status === "FALLIDO" || e.status === "ERROR");
  return malas.length
    ? malas.map((e) => `${e.to}: ${e.detail ?? e.status}`).join(" | ").slice(0, 500)
    : null;
};

/** Cloudflare usa "<id@dominio>" en los eventos; `send()` puede devolverlo sin <>. */
const eventMessageId = (id: string) => (id.startsWith("<") ? id : `<${id}>`);

const mapStatus = (raw: string): EntregaStatus => {
  const s = raw.toLowerCase();
  if (s === "delivered") return "ENTREGADO";
  if (/fail|reject|bounce|drop|error/.test(s)) return "FALLIDO";
  return "EN_COLA"; // "sent": aceptado y en cola
};

export const debeConsultarse = (e: EmailEntrega, now: number) =>
  e.status !== "ENTREGADO" &&
  e.status !== "ERROR" &&
  e.status !== "OMITIDO" &&
  !!e.acceptedAt &&
  now - Date.parse(e.acceptedAt) < SEGUIMIENTO_MS;

export const seguimientoConfigurado = (env: Bindings) =>
  !!(env.CF_ANALYTICS_TOKEN && env.CF_ZONE_ID);

/** Aplica los eventos a las entregas. Función pura. */
export function aplicarEventos(
  entregas: EmailEntrega[],
  eventos: EmailEvent[],
  now: number
): EmailEntrega[] {
  return entregas.map((e) => {
    if (!debeConsultarse(e, now)) return e;
    const propios = e.messageId
      ? eventos
          .filter(
            (ev) =>
              ev.messageId === eventMessageId(e.messageId as string) &&
              ev.envelopeTo?.toLowerCase() === e.to.toLowerCase()
          )
          .sort((a, b) => a.datetime.localeCompare(b.datetime))
      : [];
    const ultimo = propios[propios.length - 1];
    if (ultimo) {
      const status = mapStatus(ultimo.status);
      return {
        ...e,
        status,
        at: ultimo.datetime,
        detail:
          status === "FALLIDO"
            ? [ultimo.status, ultimo.errorCause, ultimo.errorDetail].filter(Boolean).join(": ").slice(0, 300)
            : null,
      };
    }
    if (now - Date.parse(e.acceptedAt as string) >= SIN_REGISTRO_MS) {
      return {
        ...e,
        status: "SIN_REGISTRO",
        detail: "Cloudflare aceptó el envío, pero no registra ningún evento para este destinatario",
      };
    }
    return e;
  });
}

/** Consulta a Cloudflare los eventos de esos mensajes. Lanza si la API falla. */
export async function fetchEmailEvents(
  env: Bindings,
  messageIds: string[],
  since: Date,
  until: Date
): Promise<EmailEvent[]> {
  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `query($zone:String!,$since:Time!,$until:Time!,$ids:[string!]){viewer{zones(filter:{zoneTag:$zone}){
        envio:emailSendingAdaptive(limit:200,orderBy:[datetime_ASC],filter:{datetime_geq:$since,datetime_leq:$until,messageId_in:$ids}){
          datetime messageId envelopeTo status errorCause errorDetail
        }
        routing:emailRoutingAdaptive(limit:200,orderBy:[datetime_ASC],filter:{datetime_geq:$since,datetime_leq:$until,messageId_in:$ids,eventType:"newEmail"}){
          datetime messageId to status errorDetail
        }
      }}}`,
      variables: {
        zone: env.CF_ZONE_ID,
        since: since.toISOString(),
        until: until.toISOString(),
        ids: messageIds.map(eventMessageId),
      },
    }),
  });
  const data: any = await res.json().catch(() => null);
  if (!res.ok || !data || data.errors?.length) {
    throw new Error(
      `Analytics ${res.status}: ${data?.errors?.[0]?.message ?? "respuesta inválida"}`.slice(0, 300)
    );
  }
  const zone = data.data?.viewer?.zones?.[0];
  // En routing, `to` puede traer varios destinatarios separados por coma.
  const routing: EmailEvent[] = (zone?.routing ?? []).flatMap((ev: any) =>
    String(ev.to ?? "")
      .split(",")
      .map((to) => to.trim())
      .filter(Boolean)
      .map((to) => ({
        datetime: ev.datetime,
        messageId: ev.messageId,
        envelopeTo: to,
        status: ev.status,
        errorDetail: ev.errorDetail,
      }))
  );
  // Primero routing: con la misma hora manda el dataset de envío, más detallado.
  return [...routing, ...(zone?.envio ?? [])];
}
