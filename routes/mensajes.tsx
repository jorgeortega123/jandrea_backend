import { Hono } from "hono";
import { Bindings } from "../types/types";
import prismaClients from "../src/lib/prismaClients";

const newRouterRespuestas = new Hono<{ Bindings: Bindings }>();

// Obtener todas las respuestas predefinidas
newRouterRespuestas.get("/predefinidas", async (c) => {
  try {
    const prisma = await prismaClients.fetch(c.env.DB);
    const respuestas = await prisma.respuestaPredefinidasSchema.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return c.json(respuestas);
  } catch (error) {
    console.error("Error al obtener respuestas predefinidas:", error);
    return c.json({ error: "Error al obtener respuestas predefinidas" }, 500);
  }
});

// Agregar una nueva respuesta predefinida
newRouterRespuestas.post("/predefinidas", async (c) => {
  try {
    const prisma = await prismaClients.fetch(c.env.DB);
    const body = await c.req.json();
    const { mensaje, respuesta } = body;

    if (!mensaje || !respuesta) {
      return c.json({ error: "Los campos 'mensaje' y 'respuesta' son requeridos" }, 400);
    }

    const nuevaRespuesta = await prisma.respuestaPredefinidasSchema.create({
      data: {
        mensaje,
        respuesta,
      },
    });

    return c.json(nuevaRespuesta, 201);
  } catch (error) {
    console.error("Error al crear respuesta predefinida:", error);
    return c.json({ error: "Error al crear respuesta predefinida" }, 500);
  }
});

// Borrar una respuesta predefinida
newRouterRespuestas.delete("/predefinidas/:id", async (c) => {
  try {
    const prisma = await prismaClients.fetch(c.env.DB);
    const id = parseInt(c.req.param("id"));

    if (isNaN(id)) {
      return c.json({ error: "ID inválido" }, 400);
    }

    const respuestaExistente = await prisma.respuestaPredefinidasSchema.findUnique({
      where: { id },
    });

    if (!respuestaExistente) {
      return c.json({ error: "Respuesta predefinida no encontrada" }, 404);
    }

    await prisma.respuestaPredefinidasSchema.delete({
      where: { id },
    });

    return c.json({ message: "Respuesta predefinida eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar respuesta predefinida:", error);
    return c.json({ error: "Error al eliminar respuesta predefinida" }, 500);
  }
});

export default newRouterRespuestas;
