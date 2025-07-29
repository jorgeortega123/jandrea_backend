import { Hono } from "hono";
import { Bindings } from "../types/types";
import prismaClients from "../src/lib/prismaClients";
import { Producto } from "../types/Product";

const newRouterCategories = new Hono<{ Bindings: Bindings }>();
newRouterCategories.get("/", async (c) => {
  const prisma = await prismaClients.fetch(c.env.DB);

  const categorias = await prisma.categoria.findMany();

  return c.json(categorias);
});
newRouterCategories.post("/create", async (c) => {
  const prisma = await prismaClients.fetch(c.env.DB);
  const body = await c.req.json();

  if (!Array.isArray(body)) {
    return c.json({ error: "El cuerpo debe ser un array de categorías" }, 400);
  }

  for (const cat of body) {
    await prisma.categoria.upsert({
      where: { categoryId: cat.categoryId },
      update: {}, // no actualiza si ya existe
      create: {
        seoTitle: cat.seoTitle,
        categoryId: cat.categoryId,
        img: cat.img,
        imagenPrefijo: cat.imagenPrefijo,
        title: cat.title,
      },
    });
  }

  return c.json({ message: "Categorías creadas o ya existentes detectadas" });
});

newRouterCategories.get("/img/from/producto/:id", async (c) => {
  const prisma = await prismaClients.fetch(c.env.DB);
  const { id } = c.req.param();
  try {
    const producto = await prisma.producto.findFirst({
      orderBy: {
        createdAt: "desc", // el campo de fecha que tengas en tu modelo
      },
      include: {
        variants: {
          take: 1,
          include: {
            images: {
              take: 2,
            },
          },
        },
      },
    });
    return c.json(producto?.variants[0]?.images || []);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Error al obtener productos" }, 500);
  }
});

newRouterCategories.get("/products/by-category/:categoryId", async (c) => {
  const prisma = await prismaClients.fetch(c.env.DB);

  const { categoryId } = c.req.param();
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "5");

  if (!categoryId) {
    return c.json({ error: "Falta categoryId" }, 400);
  }

  const skip = (page - 1) * limit;

  try {
    const productos = await prisma.producto.findMany({
      where: { categoryId },
      skip,
      take: limit,
      include: {
        variants: {
          take: 1,
          include: {
            images: {
              take: 2,
            },
          },
        }, // ajustalo si querés menos info
      },
    });

    const total = await prisma.producto.count({
      where: { categoryId },
    });

    const hasNextPage = skip + productos.length < total;

    return c.json({ productos, hasNextPage });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Error al obtener productos" }, 500);
  }
});

export default newRouterCategories;
