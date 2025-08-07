import { Hono } from "hono";
import { Bindings } from "../types/types";
import prismaClients from "../src/lib/prismaClients";
import { Producto } from "../types/Product";

const newRouterProducts = new Hono<{ Bindings: Bindings }>();

newRouterProducts.post("/create", async (c) => {
  const body: Producto[] = await c.req.json();
  const prisma = await prismaClients.fetch(c.env.DB);

  try {
    for (const producto of body) {
      // const categoriaExistente = await prisma.categoria.findUnique({
      //   where: { categoryId: producto.categoryId },
      // });
      const categoriaExistente = await prisma.categoria.findUnique({
        where: { categoryId: producto.categoryId },
      });
      console.log(categoriaExistente);
      if (!categoriaExistente) {
        return c.json(
          { error: `La categoría ${producto.categoryId} no existe` },
          400
        );
      }

      await prisma.producto.create({
        data: {
          title: producto.title,
          categoryId: categoriaExistente.id,
          identificador: producto.identificador,
          description: producto.description,
          docena: producto.docena,
          cantidad: producto.cantidad,
          topicTags: {
            create: producto.topicTag?.map((tag) => ({ tag })) || [],
          },
          variants: {
            create: producto.variants.map((variant) => ({
              description: variant.description,
              price: variant.price,
              priceWithoutOff: variant.priceWithoutOff,
              precioDocena: variant.precioDocena,
              sizes_x: variant.sizes?.x,
              sizes_y: variant.sizes?.y,
              sizes_z: variant.sizes?.z,
              images: {
                create: variant.images.map((img) => ({
                  src: img.src,
                  isVideo: img.isVideo,
                  needContrast: img.needContrast,
                })),
              },
              colors: {
                create:
                  variant.colors?.map((c) => ({
                    name: c.name,
                    color: c.color,
                  })) || [],
              },
            })),
          },
        },
      });
    }

    return c.json({ message: "Productos creados correctamente" }, 201);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Error al crear productos" }, 500);
  }
});
newRouterProducts.get("/recomendados", async (c) => {
  const prisma = await prismaClients.fetch(c.env.DB);
  console.log(prisma);

  try {
    const productos = await prisma.producto.findMany({
      where: {
        topicTags: {
          some: {
            tag: { in: ["nuevo", "new"] },
          },
        },
      },
      include: {
        variants: {
          select: {
            price: true,
            priceWithoutOff: true,
            images: {
              take: 2,
              select: { src: true },
            },
          },
        },
      },
    });

    return c.json({ productos });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Error al obtener productos recomendados" }, 500);
  }
});

newRouterProducts.get("/preview", async (c) => {
  const prisma = await prismaClients.fetch(c.env.DB);

  const page = Number(c.req.query("page") || "1");
  const limit = Number(c.req.query("limit") || "10");
  const skip = (page - 1) * limit;

  const productos = await prisma.producto.findMany({
    skip,
    take: limit,
    select: {
      id: true,
      title: true,
      identificador: true,
      categoryId: true,
      variants: {
        take: 1,
        select: {
          price: true,
          priceWithoutOff: true,
          images: {
            take: 1,
            select: {
              src: true,
            },
          },
        },
      },
    },
  });

  return c.json({
    page,
    limit,
    productos,
  });
});
// newRouterProducts.get("/custom/:id", async (c) => {
//   const prisma = await prismaClients.fetch(c.env.DB);
//   const id = c.req.param("id");

//   const producto = await prisma.producto.findUnique({
//     where: { id },
//     include: {
//       topicTags: true,
//       variants: {
//         include: {
//           images: true,
//           colors: true,
//         },
//       },
//     },
//   });

//   if (!producto) {
//     return c.json({ error: "Producto no encontrado" }, 404);
//   }

//   return c.json({ producto });
// });

newRouterProducts.get("/:categoryId", async (c) => {
  const prisma = await prismaClients.fetch(c.env.DB);
  const categoryId = c.req.param("categoryId");

  // Parámetros de paginación por query, con valores por defecto
  const page = parseInt(c.req.query("page") || "1");
  const pageSize = parseInt(c.req.query("pageSize") || "10");

  const skip = (page - 1) * pageSize;

  const productos = await prisma.producto.findMany({
    where: { categoryId },
    skip,
    take: pageSize,
    include: {
      variants: {
        take: 1,
        select: {
          price: true,
          priceWithoutOff: true,
          images: {
            take: 0,
            select: { src: true },
          },
        },
      },
      topicTags: true,
    },
  });

  // Total de productos para la paginación
  const total = await prisma.producto.count({
    where: { categoryId },
  });

  return c.json({
    productos,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
});

newRouterProducts.patch("/:id/price", async (c) => {
  const prisma = await prismaClients.fetch(c.env.DB);
  const id = c.req.param("id");
  const { price, priceNoOff } = await c.req.json();

  if (typeof price !== "number" && typeof priceNoOff !== "number") {
    return c.json({ error: "Precio inválido" }, 400);
  }

  try {
    const producto = await prisma.producto.findUnique({
      where: { id },
      include: {
        variants: {
          take: 1,
          select: { id: true },
        },
      },
    });

    if (!producto || producto.variants.length === 0) {
      return c.json({ error: "Producto o variante no encontrada" }, 404);
    }

    const variantId = producto.variants[0].id;

    await prisma.variants_producto.update({
      where: { id: variantId },
      data: { price, priceWithoutOff: priceNoOff },
    });

    return c.json({ message: "Precio actualizado correctamente" });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Error al actualizar el precio" }, 500);
  }
});

newRouterProducts.patch("/edit/:id", async (c) => {
  const prisma = await prismaClients.fetch(c.env.DB);
  const id = c.req.param("id");
  const body: Partial<Producto> = await c.req.json();

  try {
    const existing = await prisma.producto.findUnique({ where: { id } });
    if (!existing) {
      return c.json({ error: "Producto no encontrado" }, 404);
    }

    const updated = await prisma.producto.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        cantidad: body.cantidad,
        docena: body.docena,
        identificador: body.identificador,
        topicTags: {
          deleteMany: {},
          create:
            body.topicTags?.map((tag) => ({
              tag: tag.tag,
            })) || [],
        },
        variants: {
          deleteMany: {},
          create:
            body.variants?.map((variant) => ({
              description: variant.description,
              price: variant.price,
              priceWithoutOff: variant.priceWithoutOff,
              precioDocena: variant.precioDocena,
              sizes_x: variant.sizes_x,
              sizes_y: variant.sizes_y,
              sizes_z: variant.sizes_z,
              images: {
                create: variant.images.map((img) => ({
                  src: img.src,
                  isVideo: img.isVideo,
                  needContrast: img.needContrast,
                })),
              },
              colors: {
                create:
                  variant.colors?.map((c) => ({
                    name: c.name,
                    color: c.color,
                  })) || [],
              },
            })) || [],
        },
      },
    });

    return c.json({ message: "Producto actualizado", updated });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Error al actualizar producto" }, 500);
  }
});

newRouterProducts.get("/custom/:id", async (c) => {
  const prisma = await prismaClients.fetch(c.env.DB);
  const id = c.req.param("id");
  const skipVariant: number = Number(c.req.query("variantSkip")) ?? 0;
  // if (!skipVariant) return c.json({ error: "Error en parametro skip" }, 500);
  try {
    const producto = await prisma.producto.findUnique({
      where: { id },
      include: {
        topicTags: true,
        variants: {
          include: {
            images: {
              skip: skipVariant ?? 0,
            },
            colors: true,
          },
        },
      },
    });
    console.log("first");
    return c.json({ producto });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Error al obtener el producto" }, 500);
  }
});
newRouterProducts.get("/custom/old/:id", async (c) => {
  const prisma = await prismaClients.fetch(c.env.DB);
  const id = c.req.param("id");
  const skipVariant: number = Number(c.req.query("variantSkip")) ?? 0;
  // if (!skipVariant) return c.json({ error: "Error en parametro skip" }, 500);
  try {
    const producto = await prisma.producto.findUnique({
      where: { identificador: id },
      include: {
        topicTags: true,
        variants: {
          include: {
            images: {
              skip: skipVariant ?? 0,
            },
            colors: true,
          },
        },
      },
    });

    return c.json({ producto });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Error al obtener el producto" }, 500);
  }
});
newRouterProducts.get("/all/names", async (c) => {
  const prisma = await prismaClients.fetch(c.env.DB);

  try {
    const productos = await prisma.producto.findMany({
      select: {
        id: true,
        title: true,
      },
    });

    return c.json({ productos }); // Devuelve un array con { id, title }
  } catch (error) {
    console.error(error);
    return c.json({ error: "Error al obtener los productos" }, 500);
  }
});
newRouterProducts.get("/all/length", async (c) => {
  const prisma = await prismaClients.fetch(c.env.DB);

  try {
    const total = await prisma.producto.count();

    return c.json({ length: total }); // Devuelve algo como { length: 123 }
  } catch (error) {
    console.error(error);
    return c.json({ error: "Error al contar los productos" }, 500);
  }
});
export default newRouterProducts;
