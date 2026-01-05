import { Hono } from "hono";
import { Bindings } from "../types/types";
import prismaClients from "../src/lib/prismaClients";
import { Producto } from "../types/Product";

const coleccionesRouter = new Hono<{ Bindings: Bindings }>();

// Agregar una nueva colección
coleccionesRouter.post("/add", async (c) => {
  const body = await c.req.json();
  const { word, title, description, type } = body;

  if (!word) {
    return c.json({ error: "El campo 'word' es requerido" }, 400);
  }

  const prisma = await prismaClients.fetch(c.env.DB);

  const newColeccion = await prisma.coleccionesTag.create({
    data: {
      word,
      title: title || null,
      description: description || null,
      type: type || null,
    },
  });

  return c.json({
    message: "Colección creada exitosamente",
    coleccion: newColeccion,
  });
});

// Obtener todas las colecciones con paginación
coleccionesRouter.get("/all", async (c) => {
  const prisma = await prismaClients.fetch(c.env.DB);

  // Obtener parámetros de paginación desde query params
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");

  // Calcular skip
  const skip = (page - 1) * limit;

  // Obtener total de colecciones
  const totalColecciones = await prisma.coleccionesTag.count();

  // Obtener colecciones paginadas
  const colecciones = await prisma.coleccionesTag.findMany({
    skip,
    take: limit,
    orderBy: {
      createdAt: "desc",
    },
  });

  // Calcular metadata de paginación
  const totalPages = Math.ceil(totalColecciones / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return c.json({
    colecciones,
    pagination: {
      currentPage: page,
      totalPages,
      totalColecciones,
      limit,
      hasNextPage,
      hasPrevPage,
    },
  });
});

// Obtener una colección específica por ID
coleccionesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const prisma = await prismaClients.fetch(c.env.DB);

  const coleccion = await prisma.coleccionesTag.findUnique({
    where: { id },
  });

  if (!coleccion) {
    return c.json({ error: "Colección no encontrada" }, 404);
  }

  return c.json({ coleccion });
});

// Actualizar una colección
coleccionesRouter.put("/update/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { word, title, description, type } = body;

  const prisma = await prismaClients.fetch(c.env.DB);

  const coleccion = await prisma.coleccionesTag.findUnique({
    where: { id },
  });

  if (!coleccion) {
    return c.json({ error: "Colección no encontrada" }, 404);
  }

  const updatedColeccion = await prisma.coleccionesTag.update({
    where: { id },
    data: {
      word: word || coleccion.word,
      title: title !== undefined ? title : coleccion.title,
      description:
        description !== undefined ? description : coleccion.description,
      type: type !== undefined ? type : coleccion.type,
    },
  });

  return c.json({
    message: "Colección actualizada exitosamente",
    coleccion: updatedColeccion,
  });
});

// Eliminar una colección
coleccionesRouter.delete("/delete/:id", async (c) => {
  const id = c.req.param("id");
  const prisma = await prismaClients.fetch(c.env.DB);

  const coleccion = await prisma.coleccionesTag.findUnique({
    where: { id },
  });

  if (!coleccion) {
    return c.json({ error: "Colección no encontrada" }, 404);
  }

  await prisma.coleccionesTag.delete({
    where: { id },
  });

  return c.json({ message: "Colección eliminada exitosamente" });
});

// Obtener productos filtrados por tag con paginación
coleccionesRouter.post("/by-tag", async (c) => {
  try {
    const body = await c.req.json();
    const { word, page = 1, limit = 20 } = body;

    if (!word) {
      return c.json({ error: "El campo 'word' (tag) es requerido" }, 400);
    }

    const prisma = await prismaClients.fetch(c.env.DB);
    const skip = (page - 1) * limit;

    // Buscar productos que tengan el tag especificado
    const productos = await prisma.producto.findMany({
      where: {
        topicTags: {
          some: {
            tag: word,
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        variants: {
          include: {
            images: {
              take: 2,
            },
          },
        },
      },
    });

    // Contar total de productos con ese tag
    const totalProductos = await prisma.producto.count({
      where: {
        topicTags: {
          some: {
            tag: word,
          },
        },
      },
    });

    // Calcular metadata de paginación
    const totalPages = Math.ceil(totalProductos / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return c.json({
      success: true,
      tag: word,
      productos,
      pagination: {
        currentPage: page,
        totalPages,
        totalProductos,
        limit,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    console.error("Error al obtener productos por tag:", error);
    return c.json(
      {
        success: false,
        error: "Error al obtener productos por tag",
        details: error,
      },
      500
    );
  }
});

export default coleccionesRouter;
