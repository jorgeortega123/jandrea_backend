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
    expireCupon,
  } = body;

  // Validar campos requeridos
  const requiredFields = [
    // { field: "code", name: "código" },
    { field: "name", name: "nombre" },
    // { field: "email", name: "email" },
    // { field: "phone", name: "teléfono" },
    // { field: "address", name: "dirección" },
    // { field: "dni", name: "DNI" },
    { field: "subTotal", name: "subtotal" },
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
    // ENCONTRAR PRODUCTO
    //   prisma.facturaSinInva.findUnique({
    //     where: { id: 1 },
    //     include: { products: {}, discounts: {} },
    //   });
    function generarCodigo(): number {
      return Math.floor(100000 + Math.random() * 900000);
    }
    const factura = await prisma.facturaSinInva.create({
      data: {
        code,
        valueCupon,
        expireCupon: new Date(expireCupon),
        name,
        email,
        phone,
        facturaId: generarCodigo(),
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
export default newRouter;
