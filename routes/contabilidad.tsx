import { Hono } from "hono";
import { Bindings } from "../types/types";
import prismaClients from "../src/lib/prismaClients";

const contabilidadRouter = new Hono<{ Bindings: Bindings }>();

// Crear un nuevo gasto
contabilidadRouter.post("/create", async (c) => {
  try {
    const body = await c.req.json();
    const { title, description, mount, type } = body;

    if (!mount) {
      return c.json({ error: "El monto es requerido" }, 400);
    }

    const prisma = await prismaClients.fetch(c.env.DB);

    const nuevoGasto = await prisma.gastosJandrea.create({
      data: {
        title: title || null,
        description: description || null,
        mount: Number(mount),
        type: type || null,
      },
    });

    return c.json({
      success: true,
      message: "Gasto creado exitosamente",
      gasto: nuevoGasto,
    });
  } catch (error) {
    console.error("Error al crear gasto:", error);
    return c.json(
      {
        success: false,
        error: "Error al crear el gasto",
        details: error,
      },
      500
    );
  }
});

// Editar un gasto existente
contabilidadRouter.put("/update/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { title, description, mount, type } = body;

    const prisma = await prismaClients.fetch(c.env.DB);

    // Verificar si el gasto existe
    const gastoExistente = await prisma.gastosJandrea.findUnique({
      where: { id },
    });

    if (!gastoExistente) {
      return c.json({ error: "Gasto no encontrado" }, 404);
    }

    // Actualizar el gasto
    const gastoActualizado = await prisma.gastosJandrea.update({
      where: { id },
      data: {
        title: title !== undefined ? title : gastoExistente.title,
        description: description !== undefined ? description : gastoExistente.description,
        mount: mount !== undefined ? Number(mount) : gastoExistente.mount,
        type: type !== undefined ? type : gastoExistente.type,
      },
    });

    return c.json({
      success: true,
      message: "Gasto actualizado exitosamente",
      gasto: gastoActualizado,
    });
  } catch (error) {
    console.error("Error al actualizar gasto:", error);
    return c.json(
      {
        success: false,
        error: "Error al actualizar el gasto",
        details: error,
      },
      500
    );
  }
});

// Eliminar un gasto
contabilidadRouter.delete("/delete/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const prisma = await prismaClients.fetch(c.env.DB);

    // Verificar si el gasto existe
    const gastoExistente = await prisma.gastosJandrea.findUnique({
      where: { id },
    });

    if (!gastoExistente) {
      return c.json({ error: "Gasto no encontrado" }, 404);
    }

    // Eliminar el gasto
    await prisma.gastosJandrea.delete({
      where: { id },
    });

    return c.json({
      success: true,
      message: "Gasto eliminado exitosamente",
    });
  } catch (error) {
    console.error("Error al eliminar gasto:", error);
    return c.json(
      {
        success: false,
        error: "Error al eliminar el gasto",
        details: error,
      },
      500
    );
  }
});

// Obtener gastos filtrados por mes
contabilidadRouter.post("/by-month", async (c) => {
  try {
    const body = await c.req.json();
    const { date } = body;

    if (!date) {
      return c.json({ error: "La fecha es requerida" }, 400);
    }

    const prisma = await prismaClients.fetch(c.env.DB);

    // Convertir la fecha recibida a objeto Date
    const fechaConsulta = new Date(date);

    // Obtener el primer día del mes
    const primerDiaMes = new Date(
      fechaConsulta.getFullYear(),
      fechaConsulta.getMonth(),
      1
    );

    // Obtener el primer día del siguiente mes
    const primerDiaMesSiguiente = new Date(
      fechaConsulta.getFullYear(),
      fechaConsulta.getMonth() + 1,
      1
    );

    // Buscar gastos en el rango de fechas
    const gastos = await prisma.gastosJandrea.findMany({
      where: {
        createdAt: {
          gte: primerDiaMes,
          lt: primerDiaMesSiguiente,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calcular el total de gastos del mes
    const totalGastos = gastos.reduce((sum, gasto) => sum + (gasto.mount || 0), 0);

    // Agrupar por tipo
    const gastosPorTipo = gastos.reduce((acc, gasto) => {
      const tipo = gasto.type || "sin_tipo";
      if (!acc[tipo]) {
        acc[tipo] = {
          tipo,
          cantidad: 0,
          total: 0,
        };
      }
      acc[tipo].cantidad++;
      acc[tipo].total += gasto.mount || 0;
      return acc;
    }, {} as Record<string, { tipo: string; cantidad: number; total: number }>);

    return c.json({
      success: true,
      mes: fechaConsulta.getMonth() + 1,
      año: fechaConsulta.getFullYear(),
      totalGastos: Number(totalGastos.toFixed(2)),
      cantidadGastos: gastos.length,
      gastos,
      resumenPorTipo: Object.values(gastosPorTipo),
    });
  } catch (error) {
    console.error("Error al obtener gastos por mes:", error);
    return c.json(
      {
        success: false,
        error: "Error al obtener los gastos del mes",
        details: error,
      },
      500
    );
  }
});

// Obtener todos los gastos con paginación
contabilidadRouter.get("/all", async (c) => {
  try {
    const prisma = await prismaClients.fetch(c.env.DB);

    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const skip = (page - 1) * limit;

    const totalGastos = await prisma.gastosJandrea.count();

    const gastos = await prisma.gastosJandrea.findMany({
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
    });

    const totalPages = Math.ceil(totalGastos / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return c.json({
      success: true,
      gastos,
      pagination: {
        currentPage: page,
        totalPages,
        totalGastos,
        limit,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    console.error("Error al obtener gastos:", error);
    return c.json(
      {
        success: false,
        error: "Error al obtener los gastos",
        details: error,
      },
      500
    );
  }
});

// Obtener estadísticas generales
contabilidadRouter.get("/stats", async (c) => {
  try {
    const prisma = await prismaClients.fetch(c.env.DB);

    const todosLosGastos = await prisma.gastosJandrea.findMany();

    const totalGeneral = todosLosGastos.reduce((sum, gasto) => sum + (gasto.mount || 0), 0);

    // Gastos por tipo
    const gastosPorTipo = todosLosGastos.reduce((acc, gasto) => {
      const tipo = gasto.type || "sin_tipo";
      if (!acc[tipo]) {
        acc[tipo] = {
          tipo,
          cantidad: 0,
          total: 0,
        };
      }
      acc[tipo].cantidad++;
      acc[tipo].total += gasto.mount || 0;
      return acc;
    }, {} as Record<string, { tipo: string; cantidad: number; total: number }>);

    return c.json({
      success: true,
      totalGeneral: Number(totalGeneral.toFixed(2)),
      cantidadTotal: todosLosGastos.length,
      gastosPorTipo: Object.values(gastosPorTipo),
    });
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    return c.json(
      {
        success: false,
        error: "Error al obtener las estadísticas",
        details: error,
      },
      500
    );
  }
});

export default contabilidadRouter;
