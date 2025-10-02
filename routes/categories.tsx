import { Hono } from "hono";
import { Bindings } from "../types/types";
import prismaClients from "../src/lib/prismaClients";
import { Producto } from "../types/Product";

const newRouterCategories = new Hono<{ Bindings: Bindings }>();
// saber la categoria a apartir de un ID del producto
newRouterCategories.get("/producto/:id", async (c) => {
  const { id } = c.req.param();
  const prisma = await prismaClients.fetch(c.env.DB);

  const categoria = await prisma.categoria.findUnique({
    where: {
      id: id,
    },
  });

  return c.json(categoria);
});
// saber la categoria a apartir de un categoryId del producto (para codig viejo)
newRouterCategories.get("/producto/old/:id", async (c) => {
  const { id } = c.req.param();
  const prisma = await prismaClients.fetch(c.env.DB);

  const categoria = await prisma.categoria.findUnique({
    where: {
      categoryId: id,
    },
  });

  return c.json(categoria);
});
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
    console.log(cat);
    await prisma.categoria.upsert({
      where: { categoryId: cat.categoryId },
      update: {}, // no actualiza si ya existe
      create: {
        seoTitle: cat.seoTitle,
        categoryId: cat.categoryId,
        img: cat.img,
        imagenPrefijo: cat.imagenPrefijo ?? "",
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

// newRouterCategories.get("/products/by-category/:categoryId", async (c) => {
//   const prisma = await prismaClients.fetch(c.env.DB);

//   const { categoryId } = c.req.param();
//   const page = parseInt(c.req.query("page") || "1");
//   const limit = parseInt(c.req.query("limit") || "5");

//   if (!categoryId) {
//     return c.json({ error: "Falta categoryId" }, 400);
//   }

//   const skip = (page - 1) * limit;

//   try {
//     const productos = await prisma.producto.findMany({
//       where: { categoryId },
//       skip,
//       take: limit,
//       include: {
//         variants: {
//           take: 1,
//           include: {
//             images: {
//               take: 2,
//             },
//           },
//         }, // ajustalo si querés menos info
//       },
//     });

//     const total = await prisma.producto.count({
//       where: { categoryId },
//     });

//     const hasNextPage = skip + productos.length < total;

//     return c.json({ productos, hasNextPage });
//   } catch (error) {
//     console.error(error);
//     return c.json({ error: "Error al obtener productos" }, 500);
//   }
// });

newRouterCategories.get("/products/by-category/:categoryId", async (c) => {
  const prisma = await prismaClients.fetch(c.env.DB);

  const { categoryId } = c.req.param();
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "5");

  const sortByPrice = c.req.query("sortByPrice"); // "asc" o "desc"
  const sortByDate = c.req.query("sortByDate"); // "asc" o "desc"

  if (!categoryId) {
    return c.json({ error: "Falta categoryId" }, 400);
  }

  const skip = (page - 1) * limit;

  // Armado dinámico del ordenamiento
  const orderBy: any[] = [];

  if (sortByPrice === "asc" || sortByPrice === "desc") {
    orderBy.push({ price: sortByPrice });
  }

  if (sortByDate === "asc" || sortByDate === "desc") {
    orderBy.push({ createdAt: sortByDate });
  }

  try {
    const productos = await prisma.producto.findMany({
      where: { categoryId },
      skip,
      take: limit,
      orderBy: orderBy.length > 0 ? orderBy : undefined, // solo si se pasa algo
      include: {
        variants: {
          take: 1,
          include: {
            colors: {
              take: 1,
            },
            images: {
              take: 2,
            },
          },
        },
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

newRouterCategories.put("/update/:categoryId", async (c) => {
  const { categoryId } = c.req.param();
  const prisma = await prismaClients.fetch(c.env.DB);
  const body = await c.req.json();

  // Validar que el body tenga al menos un campo válido para actualizar
  const allowedFields = ["seoTitle", "img", "imagenPrefijo", "title"];
  const updateData: Record<string, any> = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return c.json(
      { error: "No se proporcionaron campos válidos para actualizar" },
      400
    );
  }

  try {
    const updatedCategory = await prisma.categoria.update({
      where: { categoryId },
      data: updateData,
    });

    return c.json({
      message: "Categoría actualizada correctamente",
      category: updatedCategory,
    });
  } catch (error) {
    // Manejar error si no existe categoría con ese categoryId
    console.error(error);

    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return c.json({ error: "Categoría no encontrada" }, 404);
    }

    return c.json({ error: "Error al actualizar la categoría" }, 500);
  }
});

export default newRouterCategories;
