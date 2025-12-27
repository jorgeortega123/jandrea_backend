import { Hono } from "hono";
import { Bindings } from "../types/types";
import prismaClients from "../src/lib/prismaClients";

const newRouter = new Hono<{ Bindings: Bindings }>();





newRouter.post("/create", async (c, next) => {
  const body = await c.req.json();
  const prisma = await prismaClients.fetch(c.env.DB);
  const {
    code,
    valueCupon,
    name,
    email,
    phone,
    address,
    dni,
    subTotal,
    total,
    products,
    discounts,
    isPrinted,
    facturaId,
    expireCupon,
  } = body;

  // Validar campos requeridos
  const requiredFields = [
    { field: "name", name: "nombre" },
    { field: "subTotal", name: "subtotal" },
    { field: "facturaId", name: "facturaId" },
    { field: "total", name: "total" },
    { field: "products", name: "productos" },
  ];

  const missingField = requiredFields.find((f) => !body[f.field]);
  if (missingField) {
    return c.json(
      { success: false, message: `Falta ${missingField.name}` },
      400
    );
  }
  if (products.length <= 0)
    return c.json(
      { success: false, message: `No se agregaron productos` },
      400
    );
  try {
    const factura = await prisma.facturaSinInva.create({
      data: {
        code,
        valueCupon,
        expireCupon: new Date(expireCupon),
        name,
        email,
        phone,
        facturaId,
        address,
        dni: Number(dni),
        subTotal: Number(Number(subTotal).toFixed(2)),
        isPrinted,
        total: Number(Number(total).toFixed(2)),
        updatedAt: new Date(),
        createdAt: new Date(),
        products: {
          create: products,
        },
        discounts: {
          create: discounts,
        },
      },
      include: {
        products: true,
        discounts: true,
      },
    });

    return c.json({ ...factura, success: true });
  } catch (error) {
    console.log(error);
    return c.json(
      {
        success: false,
        error: "Error al procesar la factura",
        date: error,
      },
      500
    );
  }
});
// Obtener todas las facturas con paginación
newRouter.get("/all", async (c) => {
  const prisma = await prismaClients.fetch(c.env.DB);

  // Obtener parámetros de paginación desde query params
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");

  // Calcular skip
  const skip = (page - 1) * limit;

  try {
    // Obtener total de facturas
    const totalFacturas = await prisma.facturaSinInva.count();

    // Obtener facturas paginadas con sus productos y descuentos
    const facturas = await prisma.facturaSinInva.findMany({
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        products: true,
        discounts: true,
      },
    });

    // Calcular metadata de paginación
    const totalPages = Math.ceil(totalFacturas / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return c.json({
      success: true,
      facturas,
      pagination: {
        currentPage: page,
        totalPages,
        totalFacturas,
        limit,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    console.error(error);
    return c.json(
      {
        success: false,
        error: "Error al obtener las facturas",
        date: error,
      },
      500
    );
  }
});

newRouter.get("/notPrinted", async (c, next) => {
  const prisma = await prismaClients.fetch(c.env.DB);
  const resultados = await prisma.facturaSinInva.findMany({
    where: {
      isPrinted: false,
    },
    include: {
      discounts: {},
      products: {},
    },
  });
  try {
    return c.json(resultados);
  } catch (error) {
    return c.json({
      success: false,
      error: "Error al procesar la factura",
      date: error,
    });
  }
});
newRouter.patch("/updateState", async (c, next) => {
  const prisma = await prismaClients.fetch(c.env.DB);
  const { id } = await c.req.json();

  if (!id) return c.json({ success: false, error: "No existe ID" });

  try {
    const facturaActualizada = await prisma.facturaSinInva.update({
      where: { id: id },
      data: {
        isPrinted: true,
      },
    });

    return c.json(facturaActualizada);
  } catch (error) {
    return c.json({
      success: false,
      error: "Error al actualizar la factura",
      date: error,
    });
  }
});
newRouter.delete("/delete", async (c) => {
  const prisma = await prismaClients.fetch(c.env.DB);
  const { id } = await c.req.json();

  if (!id) {
    return c.json({ success: false, error: "No existe ID" }, 400);
  }

  try {
    // Primero eliminar hijos
    await prisma.productSchema.deleteMany({
      where: { facturaSinInvaId: id },
    });

    await prisma.discountSchema.deleteMany({
      where: { facturaSinInvaId: id },
    });

    // Luego eliminar la factura
    const facturaEliminada = await prisma.facturaSinInva.delete({
      where: { id },
    });

    return c.json({
      success: true,
      message: "Factura eliminada con sus productos y descuentos",
      factura: facturaEliminada,
    });
  } catch (error) {
    console.error(error);
    return c.json(
      { success: false, error: "Error al eliminar la factura", date: error },
      500
    );
  }
});




export default newRouter;
