import { Hono } from "hono";
import { Bindings } from "../types/types";
import prismaClients from "../src/lib/prismaClients";
import { createAuth } from "../src/lib/auth";

const userRouter = new Hono<{ Bindings: Bindings }>();

// Middleware: obtener session del usuario
userRouter.use("*", async (c, next) => {
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
      {
        success: false,
        message: error?.message || "Error verificando sesión",
      },
      500
    );
  }
});

// GET /favorites - Obtener favoritos del usuario
userRouter.get("/favorites", async (c) => {
  try {
    const user = c.get("user") as { id: string };
    const prisma = await prismaClients.fetch(c.env.DB);

    const favorites = await prisma.userFavorite.findMany({
      where: { userId: user.id },
      include: {
        producto: {
          select: {
            id: true,
            title: true,
            identificador: true,
            price: true,
            categoryId: true,
            variants: {
              select: {
                price: true,
                priceWithoutOff: true,
                images: { select: { src: true } },
              },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return c.json({ success: true, favorites });
  } catch (error: any) {
    console.error("[Get Favorites Error]", error);
    return c.json({ success: false, message: error?.message || "Error obteniendo favoritos" }, 500);
  }
});

// POST /favorites - Agregar favorito
userRouter.post("/favorites", async (c) => {
  try {
    const user = c.get("user") as { id: string };
    const { productoId } = await c.req.json();

    if (!productoId) {
      return c.json({ success: false, message: "productoId es requerido" }, 400);
    }

    const prisma = await prismaClients.fetch(c.env.DB);

    const existing = await prisma.userFavorite.findUnique({
      where: {
        userId_productoId: { userId: user.id, productoId },
      },
    });

    if (existing) {
      return c.json({ success: true, favorite: existing });
    }

    const favorite = await prisma.userFavorite.create({
      data: { userId: user.id, productoId },
    });

    return c.json({ success: true, favorite });
  } catch (error: any) {
    console.error("[Add Favorite Error]", error);
    return c.json({ success: false, message: error?.message || "Error agregando favorito" }, 500);
  }
});

// DELETE /favorites/:productoId - Eliminar favorito
userRouter.delete("/favorites/:productoId", async (c) => {
  try {
    const user = c.get("user") as { id: string };
    const productoId = c.req.param("productoId");
    const prisma = await prismaClients.fetch(c.env.DB);

    await prisma.userFavorite.deleteMany({
      where: { userId: user.id, productoId },
    });

    return c.json({ success: true, message: "Favorito eliminado" });
  } catch (error: any) {
    console.error("[Delete Favorite Error]", error);
    return c.json({ success: false, message: error?.message || "Error eliminando favorito" }, 500);
  }
});

// GET /address - Obtener direcciones del usuario
userRouter.get("/address", async (c) => {
  try {
    const user = c.get("user") as { id: string };
    const prisma = await prismaClients.fetch(c.env.DB);

    const addresses = await prisma.userAddress.findMany({
      where: { userId: user.id },
      orderBy: { isDefault: "desc" },
    });

    return c.json({ success: true, addresses });
  } catch (error: any) {
    console.error("[Get Address Error]", error);
    return c.json({ success: false, message: error?.message || "Error obteniendo direcciones" }, 500);
  }
});

// POST /address - Crear dirección
userRouter.post("/address", async (c) => {
  try {
    const user = c.get("user") as { id: string };
    const body = await c.req.json();
    const prisma = await prismaClients.fetch(c.env.DB);

    if (!body.name || !body.address) {
      return c.json({ success: false, message: "Nombre y dirección son requeridos" }, 400);
    }

    if (body.isDefault) {
      await prisma.userAddress.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    }

    const address = await prisma.userAddress.create({
      data: {
        userId: user.id,
        name: body.name,
        phone: body.phone,
        address: body.address,
        city: body.city,
        province: body.province,
        isDefault: body.isDefault ?? false,
      },
    });

    return c.json({ success: true, address });
  } catch (error: any) {
    console.error("[Create Address Error]", error);
    return c.json({ success: false, message: error?.message || "Error creando dirección" }, 500);
  }
});

// PUT /address/:id - Actualizar dirección
userRouter.put("/address/:id", async (c) => {
  try {
    const user = c.get("user") as { id: string };
    const addressId = c.req.param("id");
    const body = await c.req.json();
    const prisma = await prismaClients.fetch(c.env.DB);

    if (body.isDefault) {
      await prisma.userAddress.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    }

    const address = await prisma.userAddress.update({
      where: { id: addressId },
      data: {
        name: body.name,
        phone: body.phone,
        address: body.address,
        city: body.city,
        province: body.province,
        isDefault: body.isDefault,
      },
    });

    return c.json({ success: true, address });
  } catch (error: any) {
    console.error("[Update Address Error]", error);
    return c.json({ success: false, message: error?.message || "Error actualizando dirección" }, 500);
  }
});

// DELETE /address/:id - Eliminar dirección
userRouter.delete("/address/:id", async (c) => {
  try {
    const user = c.get("user") as { id: string };
    const addressId = c.req.param("id");
    const prisma = await prismaClients.fetch(c.env.DB);

    await prisma.userAddress.delete({
      where: { id: addressId },
    });

    return c.json({ success: true, message: "Dirección eliminada" });
  } catch (error: any) {
    console.error("[Delete Address Error]", error);
    return c.json({ success: false, message: error?.message || "Error eliminando dirección" }, 500);
  }
});

// PUT /profile - Actualizar perfil
userRouter.put("/profile", async (c) => {
  try {
    const user = c.get("user") as { id: string };
    const body = await c.req.json();
    const prisma = await prismaClients.fetch(c.env.DB);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: body.name,
      },
    });

    return c.json({ success: true, user: updated });
  } catch (error: any) {
    console.error("[Update Profile Error]", error);
    return c.json({ success: false, message: error?.message || "Error actualizando perfil" }, 500);
  }
});

export default userRouter;
