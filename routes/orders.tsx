import { Hono } from "hono";
import { Bindings } from "../types/types";
import prismaClients from "../src/lib/prismaClients";
import { createAuth } from "../src/lib/auth";

const ordersRouter = new Hono<{ Bindings: Bindings }>();

// GET /receipt/* - Servir imagen de comprobante desde R2 (PUBLICO - sin auth)
ordersRouter.get("/receipt/*", async (c) => {
  const url = new URL(c.req.url);
  // pathname es /api/orders/receipt/receipts/xxx.jpg
  // extraemos todo despues de /receipt/
  const key = url.pathname.replace("/api/orders/receipt/", "");

  if (!key) {
    return c.json({ success: false, message: "Key no proporcionada" }, 400);
  }

  const object = await c.env.RECEIPTS_BUCKET.get(key);

  if (!object) {
    return c.json({ success: false, message: "Imagen no encontrada", key }, 404);
  }

  const headers = new Headers();
  headers.set("Cache-Control", "public, max-age=86400");
  headers.set("Access-Control-Allow-Origin", "*");
  object.writeHttpMetadata(headers);

  return new Response(object.body, { headers });
});

// Middleware: obtener session del usuario (solo para rutas debajo de aqui)
ordersRouter.use("*", async (c, next) => {
  // Skip auth para la ruta de receipts (ya manejada arriba)
  const url = new URL(c.req.url);
  if (url.pathname.includes("/receipt/")) {
    return next();
  }

  try {
    const auth = createAuth(c.env.DB, c.env);
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });
    if (!session?.user) {
      return c.json({ success: false, message: "No autenticado" }, 401);
    }
    c.set("user" as never, session.user);
    c.set("session" as never, session.session);
    await next();
  } catch (error: any) {
    console.error("[Auth Middleware Error]", error);
    return c.json(
      { success: false, message: error?.message || "Error verificando sesión" },
      500
    );
  }
});

// POST /upload-receipt - Subir comprobante de transferencia a R2
ordersRouter.post("/upload-receipt", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return c.json({ success: false, message: "No se envió archivo" }, 400);
    }

    const timestamp = Date.now();
    const ext = file.name.split(".").pop() || "jpg";
    const key = `receipts/${timestamp}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    await c.env.RECEIPTS_BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    const url = `https://api.jandrea.art/api/orders/receipt/${key}`;

    return c.json({ success: true, receiptUrl: url, receiptKey: key });
  } catch (error: any) {
    console.error("[Upload Receipt Error]", error);
    return c.json({ success: false, message: error?.message || "Error subiendo comprobante" }, 500);
  }
});

// POST /create - Crear pedido
ordersRouter.post("/create", async (c) => {
  try {
    const user = c.get("user") as { id: string };
    const body = await c.req.json();
    const prisma = await prismaClients.fetch(c.env.DB);

    const { items, address, city, province, lat, lng, recipientName, recipientPhone, receiptUrl, receiptKey, subtotal, shipping, total } = body;

    if (!items || items.length === 0) {
      return c.json({ success: false, message: "No hay items en el pedido" }, 400);
    }
    if (!address || !lat || !lng || !recipientName) {
      return c.json({ success: false, message: "Faltan datos de envío" }, 400);
    }
    if (!total) {
      return c.json({ success: false, message: "Falta el total" }, 400);
    }

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        address,
        city,
        province,
        lat,
        lng,
        recipientName,
        recipientPhone,
        receiptUrl,
        receiptKey,
        subtotal: Number(subtotal),
        shipping: Number(shipping || 0),
        total: Number(total),
        status: "EN_COLA",
        items: {
          create: items.map((item: any) => ({
            productoId: item.productoId,
            title: item.title,
            price: Number(item.price),
            quantity: Number(item.quantity),
            variantIndex: Number(item.variantIndex || 0),
            notes: item.notes,
            imageSrc: item.imageSrc,
          })),
        },
      },
      include: { items: true, user: { select: { id: true, name: true, email: true, image: true } } },
    });

    return c.json({ success: true, order });
  } catch (error: any) {
    console.error("[Create Order Error]", error);
    return c.json({ success: false, message: error?.message || "Error creando pedido" }, 500);
  }
});

// GET /mine - Obtener pedidos del usuario autenticado
ordersRouter.get("/mine", async (c) => {
  try {
    const user = c.get("user") as { id: string };
    const prisma = await prismaClients.fetch(c.env.DB);

    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    return c.json({ success: true, orders });
  } catch (error: any) {
    console.error("[Get My Orders Error]", error);
    return c.json({ success: false, message: error?.message || "Error obteniendo pedidos" }, 500);
  }
});

// GET /all - Obtener todos los pedidos (admin)
ordersRouter.get("/all", async (c) => {
  try {
    const prisma = await prismaClients.fetch(c.env.DB);
    const status = c.req.query("status");
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: true,
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return c.json({
      success: true,
      orders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total,
        limit,
      },
    });
  } catch (error: any) {
    console.error("[Get All Orders Error]", error);
    return c.json({ success: false, message: error?.message || "Error obteniendo pedidos" }, 500);
  }
});

// GET /:id - Detalle de un pedido
ordersRouter.get("/:id", async (c) => {
  try {
    const user = c.get("user") as { id: string };
    const orderId = c.req.param("id");
    const prisma = await prismaClients.fetch(c.env.DB);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    if (!order) {
      return c.json({ success: false, message: "Pedido no encontrado" }, 404);
    }

    return c.json({ success: true, order });
  } catch (error: any) {
    console.error("[Get Order Error]", error);
    return c.json({ success: false, message: error?.message || "Error obteniendo pedido" }, 500);
  }
});

// PATCH /:id/status - Cambiar estado del pedido (admin)
ordersRouter.patch("/:id/status", async (c) => {
  try {
    const orderId = c.req.param("id");
    const { status } = await c.req.json();
    const prisma = await prismaClients.fetch(c.env.DB);

    const validStatuses = ["EN_COLA", "PREPARANDO", "EMPACANDO", "ENVIADO"];
    if (!validStatuses.includes(status)) {
      return c.json({ success: false, message: "Estado inválido" }, 400);
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        items: true,
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    return c.json({ success: true, order });
  } catch (error: any) {
    console.error("[Update Status Error]", error);
    return c.json({ success: false, message: error?.message || "Error actualizando estado" }, 500);
  }
});

export default ordersRouter;
