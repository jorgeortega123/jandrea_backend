import { Hono, MiddlewareHandler } from "hono";
import { Bindings } from "../types/types";
import prismaClients from "../src/lib/prismaClients";
import {
  LeadItem,
  productUrl,
  sendLeadNotification,
} from "../src/lib/leadEmail";

/**
 * Solicitudes de cotización (leads).
 *
 *   POST   /leads                      público: crea la solicitud desde /cart y avisa por correo
 *   GET    /leads                      admin: listado paginado (estado, tipo, q)
 *   GET    /leads/auth                 admin: valida la clave (login de /leads y /admin)
 *   GET    /leads/:id                  admin: detalle
 *   PATCH  /leads/:id                  admin: cambiar estado
 *   DELETE /leads/:id                  admin: eliminar (spam)
 *   POST   /leads/:id/reenviar-correo  admin: reintentar el aviso por correo
 *
 * Admin = `Authorization: Bearer <LEADS_ADMIN_KEY>` (secreto del Worker).
 * Los leads tienen cédula, dirección y teléfono: nunca se exponen sin clave.
 */
const leadsRouter = new Hono<{ Bindings: Bindings }>();

export const LEAD_TIPOS = ["BASICA", "COMPLETA"] as const;
export const LEAD_ESTADOS = [
  "NUEVO",
  "CONTACTADO",
  "COTIZADO",
  "CERRADO",
  "DESCARTADO",
] as const;

const MAX_ITEMS = 60;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;

// Hosts de imagen aceptados en la solicitud (los que sirve el catálogo).
const IMAGE_HOSTS = new Set([
  "store.jandrea.art",
  "jandrea.art",
  "api.jandrea.art",
  "jandrea-backend.llampukaq.workers.dev",
  "images.llampukaq.com",
]);

// ─── Auth admin ──────────────────────────────────────────────────────────────

async function sameSecret(a: string, b: string) {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  return (crypto.subtle as any).timingSafeEqual(ha, hb) as boolean;
}

const requireAdmin: MiddlewareHandler<{ Bindings: Bindings }> = async (c, next) => {
  const expected = c.env.LEADS_ADMIN_KEY;
  if (!expected) {
    return c.json(
      { success: false, message: "Panel no configurado (falta LEADS_ADMIN_KEY)" },
      503
    );
  }
  const header = c.req.header("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || !(await sameSecret(token, expected))) {
    return c.json({ success: false, message: "Clave incorrecta" }, 401);
  }
  await next();
};

// ─── Validación ──────────────────────────────────────────────────────────────

const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function safeImage(src: unknown): string | null {
  if (typeof src !== "string" || src.length > 500) return null;
  try {
    const u = new URL(src);
    return u.protocol === "https:" && IMAGE_HOSTS.has(u.hostname) ? src : null;
  } catch {
    return null;
  }
}

type Parsed =
  | { ok: true; data: {
      tipo: (typeof LEAD_TIPOS)[number];
      nombre: string;
      email: string | null;
      telefono: string;
      cedulaRuc: string | null;
      direccion: string | null;
      notas: string | null;
      items: Omit<LeadItem, "url">[];
    } }
  | { ok: false; message: string; field?: string };

function parseLead(body: any): Parsed {
  const tipo = body?.tipo === "COMPLETA" ? "COMPLETA" : "BASICA";
  const nombre = str(body?.nombre, 120);
  const email = str(body?.email, 160).toLowerCase();
  const telefono = str(body?.telefono, 30);
  const cedulaRuc = str(body?.cedulaRuc, 20).replace(/\D/g, "");
  const direccion = str(body?.direccion, 300);
  const notas = str(body?.notas, 2000);

  if (nombre.length < 2) return { ok: false, field: "nombre", message: "Ingresa tu nombre" };
  const phoneDigits = telefono.replace(/\D/g, "");
  if (phoneDigits.length < 7 || phoneDigits.length > 15) {
    return { ok: false, field: "telefono", message: "Ingresa un número de teléfono válido" };
  }
  if (tipo === "BASICA" && !email) {
    return { ok: false, field: "email", message: "Ingresa tu correo electrónico" };
  }
  if (email && !EMAIL_RE.test(email)) {
    return { ok: false, field: "email", message: "El correo electrónico no es válido" };
  }
  if (tipo === "COMPLETA") {
    if (cedulaRuc.length !== 10 && cedulaRuc.length !== 13) {
      return {
        ok: false,
        field: "cedulaRuc",
        message: "Ingresa una cédula (10 dígitos) o RUC (13 dígitos)",
      };
    }
    if (direccion.length < 5) {
      return { ok: false, field: "direccion", message: "Ingresa tu dirección" };
    }
  }

  const rawItems: any[] = Array.isArray(body?.items) ? body.items : [];
  if (!rawItems.length) return { ok: false, message: "Tu proforma no tiene productos" };
  if (rawItems.length > MAX_ITEMS) {
    return { ok: false, message: `Máximo ${MAX_ITEMS} productos por solicitud` };
  }
  const items = rawItems.map((it) => {
    const qty = Math.floor(Number(it?.quantity));
    return {
      productoId: str(it?.productoId, 40) || null,
      identificador: str(it?.identificador, 80) || null,
      title: str(it?.title, 200) || "Producto",
      variantIndex: Math.max(0, Math.floor(Number(it?.variantIndex)) || 0),
      variantLabel: str(it?.variantLabel, 120) || null,
      quantity: Number.isFinite(qty) ? Math.min(Math.max(qty, 1), 100000) : 1,
      notes: str(it?.notes, 1000) || null,
      imageSrc: safeImage(it?.imageSrc),
    };
  });

  return {
    ok: true,
    data: {
      tipo,
      nombre,
      email: email || null,
      telefono,
      cedulaRuc: tipo === "COMPLETA" ? cedulaRuc : null,
      direccion: tipo === "COMPLETA" ? direccion : null,
      notas: notas || null,
      items,
    },
  };
}

const parseItems = (json: string): LeadItem[] => {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

const serialize = <T extends { items: string }>(lead: T) => ({
  ...lead,
  items: parseItems(lead.items),
});

async function notifyAndRecord(env: Bindings, leadId: string) {
  const prisma = await prismaClients.fetch(env.DB);
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { ok: false, error: "Solicitud no encontrada" };
  try {
    await sendLeadNotification(env, lead, parseItems(lead.items));
    await prisma.lead.update({
      where: { id: leadId },
      data: { emailStatus: "ENVIADO", emailError: null },
    });
    return { ok: true as const };
  } catch (error: any) {
    const msg = `${error?.code ? `${error.code}: ` : ""}${error?.message || error}`.slice(0, 500);
    console.error("[Lead Email Error]", leadId, msg);
    await prisma.lead.update({
      where: { id: leadId },
      data: { emailStatus: "ERROR", emailError: msg },
    });
    return { ok: false as const, error: msg };
  }
}

// ─── Público ─────────────────────────────────────────────────────────────────

leadsRouter.post("/", async (c) => {
  try {
    const body = await c.req.json().catch(() => null);
    if (!body) return c.json({ success: false, message: "Solicitud inválida" }, 400);

    // Honeypot: campo oculto que solo rellenan los bots.
    if (str(body.website, 200)) return c.json({ success: true, id: null });

    const parsed = parseLead(body);
    if (!parsed.ok) {
      return c.json({ success: false, message: parsed.message, field: parsed.field }, 400);
    }

    const prisma = await prismaClients.fetch(c.env.DB);
    const ip = c.req.header("cf-connecting-ip") || null;
    if (ip) {
      const recent = await prisma.lead.count({
        where: { ip, createdAt: { gte: new Date(Date.now() - RATE_WINDOW_MS) } },
      });
      if (recent >= RATE_MAX) {
        return c.json(
          {
            success: false,
            message: "Has enviado varias solicitudes seguidas. Intenta en unos minutos o escríbenos por WhatsApp.",
          },
          429
        );
      }
    }

    // El título y el enlace salen de la base de datos (no del cliente) cuando
    // el producto existe: el correo no puede llevar enlaces arbitrarios.
    const { items: rawItems, ...contact } = parsed.data;
    const ids = [...new Set(rawItems.map((i) => i.productoId).filter(Boolean))] as string[];
    const known = ids.length
      ? await prisma.producto.findMany({
          where: { id: { in: ids } },
          select: { id: true, title: true, identificador: true },
        })
      : [];
    const byId = new Map(known.map((p) => [p.id, p]));
    const items: LeadItem[] = rawItems.map((it) => {
      const p = it.productoId ? byId.get(it.productoId) : undefined;
      return {
        ...it,
        productoId: p ? p.id : null,
        identificador: p?.identificador ?? it.identificador,
        title: p?.title || it.title,
        url: p?.title ? productUrl(p.title) : null,
      };
    });

    const lead = await prisma.lead.create({
      data: {
        ...contact,
        items: JSON.stringify(items),
        totalItems: items.reduce((acc, i) => acc + i.quantity, 0),
        ip,
      },
    });

    // El correo no bloquea la respuesta; su resultado queda en el lead.
    c.executionCtx.waitUntil(notifyAndRecord(c.env, lead.id));

    return c.json({ success: true, id: lead.id }, 201);
  } catch (error: any) {
    console.error("[Create Lead Error]", error);
    return c.json(
      { success: false, message: "No pudimos registrar tu solicitud. Intenta de nuevo." },
      500
    );
  }
});

// ─── Admin ───────────────────────────────────────────────────────────────────

leadsRouter.get("/", requireAdmin, async (c) => {
  try {
    const prisma = await prismaClients.fetch(c.env.DB);
    const page = Math.max(1, parseInt(c.req.query("page") || "1") || 1);
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") || "20") || 20));
    const estado = c.req.query("estado");
    const tipo = c.req.query("tipo");
    const q = (c.req.query("q") || "").trim();

    const where: any = {};
    if (estado && (LEAD_ESTADOS as readonly string[]).includes(estado)) where.estado = estado;
    if (tipo && (LEAD_TIPOS as readonly string[]).includes(tipo)) where.tipo = tipo;
    if (q) {
      where.OR = [
        { nombre: { contains: q } },
        { email: { contains: q.toLowerCase() } },
        { telefono: { contains: q } },
        { cedulaRuc: { contains: q } },
      ];
    }

    const [leads, total, porEstado] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lead.count({ where }),
      prisma.lead.groupBy({ by: ["estado"], _count: { _all: true } }),
    ]);

    return c.json({
      success: true,
      leads: leads.map(serialize),
      counts: Object.fromEntries(porEstado.map((g) => [g.estado, g._count._all])),
      pagination: { currentPage: page, totalPages: Math.ceil(total / limit), total, limit },
    });
  } catch (error: any) {
    console.error("[List Leads Error]", error);
    return c.json({ success: false, message: "Error obteniendo solicitudes" }, 500);
  }
});

// Solo valida la clave (login de /leads y /admin). No toca la base de datos:
// funciona aunque falle D1 o falte aplicar la migración. Debe ir antes de "/:id".
leadsRouter.get("/auth", requireAdmin, (c) => c.json({ success: true }));

leadsRouter.get("/:id", requireAdmin, async (c) => {
  const prisma = await prismaClients.fetch(c.env.DB);
  const lead = await prisma.lead.findUnique({ where: { id: c.req.param("id") } });
  if (!lead) return c.json({ success: false, message: "Solicitud no encontrada" }, 404);
  return c.json({ success: true, lead: serialize(lead) });
});

leadsRouter.patch("/:id", requireAdmin, async (c) => {
  try {
    const { estado } = await c.req.json().catch(() => ({}));
    if (!(LEAD_ESTADOS as readonly string[]).includes(estado)) {
      return c.json({ success: false, message: "Estado inválido" }, 400);
    }
    const prisma = await prismaClients.fetch(c.env.DB);
    const lead = await prisma.lead.update({
      where: { id: c.req.param("id") },
      data: { estado },
    });
    return c.json({ success: true, lead: serialize(lead) });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return c.json({ success: false, message: "Solicitud no encontrada" }, 404);
    }
    console.error("[Update Lead Error]", error);
    return c.json({ success: false, message: "Error actualizando la solicitud" }, 500);
  }
});

leadsRouter.delete("/:id", requireAdmin, async (c) => {
  try {
    const prisma = await prismaClients.fetch(c.env.DB);
    await prisma.lead.delete({ where: { id: c.req.param("id") } });
    return c.json({ success: true });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return c.json({ success: false, message: "Solicitud no encontrada" }, 404);
    }
    console.error("[Delete Lead Error]", error);
    return c.json({ success: false, message: "Error eliminando la solicitud" }, 500);
  }
});

leadsRouter.post("/:id/reenviar-correo", requireAdmin, async (c) => {
  const result = await notifyAndRecord(c.env, c.req.param("id"));
  return c.json(
    result.ok ? { success: true } : { success: false, message: result.error },
    result.ok ? 200 : 502
  );
});

export default leadsRouter;
