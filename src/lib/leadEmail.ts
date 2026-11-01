import { Bindings } from "../../types/types";

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

export const STORE_URL = "https://store.jandrea.art";

const DEFAULT_FROM = "proformas@jandrea.art";
const DEFAULT_TO = [
  "garridoarenasjohannaandrea@gmail.com",
  "contacto@jandrea.art",
  "jandrea593ec@gmail.com",
];

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

/**
 * Avisa al equipo de una nueva solicitud. Lanza el error del proveedor
 * (Error con `code`, p. ej. E_SENDER_NOT_VERIFIED) para que el llamador lo
 * registre en Lead.emailError.
 */
export async function sendLeadNotification(
  env: Bindings,
  lead: LeadForEmail,
  items: LeadItem[]
) {
  if (!env.EMAIL) throw new Error("Binding EMAIL (send_email) no configurado");
  const to = (env.LEADS_NOTIFY_TO || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const from = (env.EMAIL_FROM || DEFAULT_FROM).trim();

  return env.EMAIL.send({
    to: to.length ? to : DEFAULT_TO,
    from: { email: from, name: "Jandrea Art · Proformas" },
    // Responder al correo = responder al cliente.
    ...(lead.email ? { replyTo: { email: lead.email, name: lead.nombre } } : {}),
    subject: `Nueva proforma: ${lead.nombre} · ${items.length} ${
      items.length === 1 ? "producto" : "productos"
    }`,
    html: buildHtml(lead, items),
    text: buildText(lead, items),
  });
}
