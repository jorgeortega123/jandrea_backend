import { Bindings } from "../../types/types";
import { Destino, EmailEntrega } from "./emailDelivery";

/** Producto tal como quedó guardado en Lead.items (JSON). */
export interface LeadItem {
  productoId: string | null;
  identificador: string | null;
  title: string;
  variantIndex: number;
  variantLabel: string | null;
  quantity: number;
  notes: string | null;
  imageSrc: string | null;
  url: string | null;
}

export interface LeadForEmail {
  id: string;
  tipo: string;
  nombre: string;
  email: string | null;
  telefono: string;
  cedulaRuc: string | null;
  direccion: string | null;
  notas: string | null;
  totalItems: number;
  createdAt: Date;
}

export const STORE_URL = "https://jandrea.art";

const DEFAULT_FROM = "proformas@jandrea.art";
/** Aviso interno "nuevo cliente". Se puede cambiar con la var LEADS_NOTIFY_TO. */
const DEFAULT_TO = ["jandrea593ec@gmail.com"];

/**
 * Copia de jandrea/lib/slug.js (slug canónico de las fichas). utils/formatWord
 * del backend NO elimina signos y daría URLs 404 para títulos con "/", "+", etc.
 */
export function productSlug(text: string) {
  return String(text ?? "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export const productUrl = (title: string) => `${STORE_URL}/producto/${productSlug(title)}`;

export const leadAdminUrl = (id: string) =>
  `${STORE_URL}/leads?id=${encodeURIComponent(id)}`;

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const nl2br = (s: string) => esc(s).replace(/\r?\n/g, "<br>");

/** Teléfono → enlace de WhatsApp (asume Ecuador si viene en formato local 09…). */
export function whatsappLink(phone: string, text = "") {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `593${digits.slice(1)}`;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

const thumb = (src: string) =>
  `https://images.llampukaq.com/v1/images?url=${src}&output=webp&w=160&q=75`;

const fechaEc = (d: Date) =>
  new Intl.DateTimeFormat("es-EC", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Guayaquil",
  }).format(d);

function buildHtml(lead: LeadForEmail, items: LeadItem[]) {
  const link = leadAdminUrl(lead.id);
  const completa = lead.tipo === "COMPLETA";
  const row = (label: string, value: string | null, html?: string) =>
    value
      ? `<tr><td style="padding:6px 0;color:#71717a;font-size:13px;width:130px;vertical-align:top">${label}</td><td style="padding:6px 0;color:#18181b;font-size:14px">${html ?? esc(value)}</td></tr>`
      : "";

  const productRows = items
    .map((it) => {
      const img = it.imageSrc
        ? `<img src="${esc(thumb(it.imageSrc))}" width="64" height="64" alt="" style="display:block;width:64px;height:64px;border-radius:8px;object-fit:cover;background:#f4f4f5">`
        : `<div style="width:64px;height:64px;border-radius:8px;background:#f4f4f5"></div>`;
      const title = it.url
        ? `<a href="${esc(it.url)}" style="color:#18181b;font-weight:600;text-decoration:none">${esc(it.title)}</a>`
        : `<span style="color:#18181b;font-weight:600">${esc(it.title)}</span>`;
      return `<tr>
  <td style="padding:12px 12px 12px 0;border-top:1px solid #e4e4e7;vertical-align:top;width:64px">${img}</td>
  <td style="padding:12px 0;border-top:1px solid #e4e4e7;vertical-align:top;font-size:14px">
    ${title}
    ${it.variantLabel ? `<div style="color:#71717a;font-size:13px;margin-top:2px">Opción: ${esc(it.variantLabel)}</div>` : ""}
    ${it.identificador ? `<div style="color:#a1a1aa;font-size:12px;margin-top:2px">Ref. ${esc(it.identificador.toUpperCase())}</div>` : ""}
    ${it.notes ? `<div style="margin-top:6px;padding:8px 10px;background:#fafafa;border-left:3px solid #f97066;color:#3f3f46;font-size:13px">${nl2br(it.notes)}</div>` : ""}
  </td>
  <td style="padding:12px 0 12px 12px;border-top:1px solid #e4e4e7;vertical-align:top;text-align:right;font-size:15px;font-weight:700;color:#18181b;white-space:nowrap">× ${it.quantity}</td>
</tr>`;
    })
    .join("");

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nueva solicitud de proforma</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden">
  <tr><td style="padding:24px 28px 8px">
    <div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#e04f45">Jandrea Art · Nueva solicitud de proforma</div>
    <h1 style="margin:8px 0 4px;font-size:22px;line-height:1.3;color:#18181b">${esc(lead.nombre)} solicita una proforma</h1>
    <div style="font-size:13px;color:#71717a">${esc(fechaEc(lead.createdAt))} · ${completa ? "Proforma con datos completos" : "Proforma básica"} · ${lead.totalItems} ${lead.totalItems === 1 ? "unidad" : "unidades"}</div>
  </td></tr>
  <tr><td style="padding:16px 28px 4px">
    <a href="${esc(link)}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:10px">Ver solicitud en /leads</a>
    <a href="${esc(whatsappLink(lead.telefono, `Hola ${lead.nombre}, te escribimos de Jandrea Art por tu solicitud de proforma.`))}" style="display:inline-block;margin-left:8px;background:#ecfdf5;color:#047857;text-decoration:none;font-weight:600;font-size:14px;padding:12px 16px;border-radius:10px">WhatsApp</a>
  </td></tr>
  <tr><td style="padding:16px 28px 0">
    <h2 style="margin:0 0 4px;font-size:15px;color:#18181b">Datos del cliente</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${row("Nombre", lead.nombre)}
      ${row("Correo", lead.email, lead.email ? `<a href="mailto:${esc(lead.email)}" style="color:#2563eb">${esc(lead.email)}</a>` : undefined)}
      ${row("Teléfono", lead.telefono, `<a href="tel:${esc(lead.telefono.replace(/[^\d+]/g, ""))}" style="color:#2563eb">${esc(lead.telefono)}</a>`)}
      ${row("Cédula / RUC", lead.cedulaRuc)}
      ${row("Dirección", lead.direccion, lead.direccion ? nl2br(lead.direccion) : undefined)}
      ${row("Notas", lead.notas, lead.notas ? nl2br(lead.notas) : undefined)}
    </table>
  </td></tr>
  <tr><td style="padding:20px 28px 8px">
    <h2 style="margin:0 0 4px;font-size:15px;color:#18181b">Productos (${items.length})</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${productRows}</table>
  </td></tr>
  <tr><td style="padding:16px 28px 24px;font-size:12px;color:#a1a1aa;border-top:1px solid #f4f4f5">
    Solicitud ${esc(lead.id)} · <a href="${esc(link)}" style="color:#a1a1aa">${esc(link)}</a>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function buildText(lead: LeadForEmail, items: LeadItem[]) {
  const opt = (label: string, v: string | null) => (v ? [`${label}: ${v}`] : []);
  return [
    `NUEVA SOLICITUD DE PROFORMA (${lead.tipo === "COMPLETA" ? "datos completos" : "básica"})`,
    fechaEc(lead.createdAt),
    "",
    `Ver en el panel: ${leadAdminUrl(lead.id)}`,
    "",
    "DATOS DEL CLIENTE",
    `Nombre: ${lead.nombre}`,
    ...opt("Correo", lead.email),
    `Teléfono: ${lead.telefono}`,
    ...opt("Cédula/RUC", lead.cedulaRuc),
    ...opt("Dirección", lead.direccion),
    ...opt("Notas", lead.notas),
    "",
    `PRODUCTOS (${items.length})`,
    ...items.map(
      (it) =>
        `- ${it.quantity} × ${it.title}${it.variantLabel ? ` (${it.variantLabel})` : ""}${
          it.notes ? `\n    Notas: ${it.notes}` : ""
        }${it.url ? `\n    ${it.url}` : ""}`
    ),
  ].join("\n");
}

// ─── Correo al cliente ───────────────────────────────────────────────────────
//
// El formulario es público y este correo va a la dirección que alguien escriba:
// NO lleva texto libre del formulario (notas, nombre completo, títulos sin
// verificar), para que no se pueda usar para enviar spam o phishing desde
// jandrea.art. Solo datos del catálogo y un saludo validado.

const WHATSAPP_JANDREA = "593986387530";

/** Primer nombre si parece un nombre; si no, se saluda sin nombre. */
const primerNombre = (nombre: string) => {
  const first = nombre.trim().split(/\s+/)[0] ?? "";
  return /^[\p{L}'-]{2,30}$/u.test(first) ? first : "";
};

/** Solo letras, números y signos básicos: descarta URLs y dominios. */
const opcionSegura = (v: string | null) =>
  v && /^[\p{L}\p{N} +()×,'-]{1,60}$/u.test(v) ? v : null;

export const referenciaLead = (id: string) => id.slice(-8).toUpperCase();

function buildClienteHtml(lead: LeadForEmail, items: LeadItem[]) {
  const nombre = primerNombre(lead.nombre);
  const ref = referenciaLead(lead.id);
  const verificados = items.filter((it) => it.url);
  const otros = items.length - verificados.length;
  const whatsapp = whatsappLink(
    WHATSAPP_JANDREA,
    `Hola, tengo una consulta sobre mi solicitud de proforma N.º ${ref}`
  );

  const filas = verificados
    .map((it) => {
      const opcion = opcionSegura(it.variantLabel);
      const img = it.imageSrc
        ? `<img src="${esc(thumb(it.imageSrc))}" width="56" height="56" alt="" style="display:block;width:56px;height:56px;border-radius:8px;object-fit:cover;background:#f4f4f5">`
        : `<div style="width:56px;height:56px;border-radius:8px;background:#f4f4f5"></div>`;
      return `<tr>
  <td style="padding:10px 12px 10px 0;border-top:1px solid #e4e4e7;vertical-align:top;width:56px">${img}</td>
  <td style="padding:10px 0;border-top:1px solid #e4e4e7;vertical-align:top;font-size:14px">
    <a href="${esc(it.url)}" style="color:#18181b;font-weight:600;text-decoration:none">${esc(it.title)}</a>
    ${opcion ? `<div style="color:#71717a;font-size:13px;margin-top:2px">Opción: ${esc(opcion)}</div>` : ""}
  </td>
  <td style="padding:10px 0 10px 12px;border-top:1px solid #e4e4e7;vertical-align:top;text-align:right;font-size:14px;font-weight:700;color:#18181b;white-space:nowrap">× ${it.quantity}</td>
</tr>`;
    })
    .join("");

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Recibimos tu solicitud de proforma</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden">
  <tr><td style="padding:28px 28px 4px">
    <div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#e04f45">Jandrea Art</div>
    <h1 style="margin:8px 0 8px;font-size:22px;line-height:1.3;color:#18181b">${nombre ? `Hola ${esc(nombre)}, recibimos` : "Recibimos"} tu solicitud de proforma</h1>
    <p style="margin:0;font-size:15px;line-height:1.55;color:#3f3f46">Tu solicitud se está procesando. Nuestro equipo la está revisando y te enviará los precios y tiempos de entrega en menos de 24 horas.</p>
  </td></tr>
  <tr><td style="padding:16px 28px 0">
    <div style="display:inline-block;background:#f4f4f5;border-radius:8px;padding:8px 12px;font-size:13px;color:#3f3f46">N.º de solicitud: <b style="font-family:ui-monospace,Menlo,Consolas,monospace;color:#18181b">${esc(ref)}</b></div>
  </td></tr>
  ${
    verificados.length
      ? `<tr><td style="padding:20px 28px 0">
    <h2 style="margin:0 0 6px;font-size:15px;color:#18181b">Productos solicitados</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${filas}</table>
    ${otros > 0 ? `<p style="margin:8px 0 0;font-size:13px;color:#71717a">y ${otros} ${otros === 1 ? "producto más" : "productos más"}</p>` : ""}
  </td></tr>`
      : ""
  }
  <tr><td style="padding:24px 28px 8px">
    <a href="${esc(whatsapp)}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:10px">Escríbenos por WhatsApp</a>
  </td></tr>
  <tr><td style="padding:16px 28px 24px;font-size:12px;line-height:1.5;color:#a1a1aa">
    Recibiste este correo porque se solicitó una proforma con esta dirección en jandrea.art. Si no fuiste tú, puedes ignorarlo.
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function buildClienteText(lead: LeadForEmail, items: LeadItem[]) {
  const nombre = primerNombre(lead.nombre);
  const verificados = items.filter((it) => it.url);
  const otros = items.length - verificados.length;
  return [
    `${nombre ? `Hola ${nombre}, recibimos` : "Recibimos"} tu solicitud de proforma.`,
    "",
    "Tu solicitud se está procesando. Nuestro equipo la está revisando y te enviará los precios y tiempos de entrega en menos de 24 horas.",
    "",
    `N.º de solicitud: ${referenciaLead(lead.id)}`,
    ...(verificados.length
      ? [
          "",
          "PRODUCTOS SOLICITADOS",
          ...verificados.map((it) => {
            const opcion = opcionSegura(it.variantLabel);
            return `- ${it.quantity} × ${it.title}${opcion ? ` (${opcion})` : ""}`;
          }),
          ...(otros > 0 ? [`y ${otros} ${otros === 1 ? "producto más" : "productos más"}`] : []),
        ]
      : []),
    "",
    "¿Dudas? Escríbenos por WhatsApp: +593 98 638 7530",
    "",
    "Recibiste este correo porque se solicitó una proforma con esta dirección en jandrea.art. Si no fuiste tú, puedes ignorarlo.",
  ].join("\n");
}

// ─── Envío ───────────────────────────────────────────────────────────────────

export const notifyRecipients = (env: Bindings) => {
  const to = (env.LEADS_NOTIFY_TO || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return to.length ? to : DEFAULT_TO;
};

/** Los dos correos de una solicitud: aviso al equipo y confirmación al cliente. */
export const destinosDeLead = (env: Bindings, lead: Pick<LeadForEmail, "email">): Destino[] => [
  ...notifyRecipients(env).map((to) => ({ tipo: "EQUIPO" as const, to })),
  ...(lead.email ? [{ tipo: "CLIENTE" as const, to: lead.email }] : []),
];

const errorText = (error: any) =>
  `${error?.code ? `${error.code}: ` : ""}${error?.message || error}`.slice(0, 300);

/**
 * Envía los correos de una solicitud, UNO por destinatario: cada uno tiene su
 * messageId y su resultado, y si uno falla los demás salen igual. No lanza: el
 * error de Cloudflare (`code`, p. ej. E_SENDER_NOT_VERIFIED) queda en la entrega.
 *
 * Que `send()` responda bien significa "aceptado y en cola" (EN_COLA), NO
 * "entregado": la entrega real se consulta después (emailDelivery.ts).
 */
export async function sendLeadEmails(
  env: Bindings,
  lead: LeadForEmail,
  items: LeadItem[],
  destinos: Destino[]
): Promise<EmailEntrega[]> {
  const now = new Date().toISOString();
  const failed = (d: Destino, detail: string): EmailEntrega => ({
    ...d,
    status: "ERROR",
    messageId: null,
    acceptedAt: null,
    at: now,
    detail,
  });
  if (!env.EMAIL) {
    return destinos.map((d) => failed(d, "Binding EMAIL (send_email) no configurado"));
  }

  const from = {
    email: (env.EMAIL_FROM || DEFAULT_FROM).trim(),
    name: "Jandrea Art",
  };
  const equipo = {
    subject: `Nueva solicitud de proforma: ${lead.nombre} · ${items.length} ${
      items.length === 1 ? "producto" : "productos"
    }`,
    html: buildHtml(lead, items),
    text: buildText(lead, items),
    // Responder a este correo = responder al cliente.
    ...(lead.email ? { replyTo: { email: lead.email, name: lead.nombre } } : {}),
  };
  const cliente = {
    subject: "Recibimos tu solicitud de proforma · Jandrea Art",
    html: buildClienteHtml(lead, items),
    text: buildClienteText(lead, items),
  };

  const results = await Promise.allSettled(
    destinos.map((d) =>
      env.EMAIL.send({ to: d.to, from, ...(d.tipo === "CLIENTE" ? cliente : equipo) })
    )
  );

  return results.map((r, i) => {
    const d = destinos[i];
    if (r.status === "rejected") {
      console.error("[Lead Email Error]", lead.id, d.tipo, d.to, errorText(r.reason));
      return failed(d, errorText(r.reason));
    }
    return {
      ...d,
      status: "EN_COLA",
      messageId: (r.value && r.value.messageId) || null,
      acceptedAt: now,
      at: now,
      detail: null,
    };
  });
}
