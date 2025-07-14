import { Hono } from "hono";
import { Bindings } from "../types/types";
import prismaClients from "../src/lib/prismaClients";

const newRouter = new Hono<{ Bindings: Bindings }>();
export const invoice = () => {
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
    } = body;

    // Validar campos requeridos
    const requiredFields = [
      { field: 'code', name: 'código' },
      { field: 'name', name: 'nombre' },
      { field: 'email', name: 'email' },
      { field: 'phone', name: 'teléfono' },
      { field: 'address', name: 'dirección' },
      { field: 'dni', name: 'DNI' },
      { field: 'subTotal', name: 'subtotal' },
      { field: 'total', name: 'total' },
      { field: 'products', name: 'productos' }
    ];

    const missingField = requiredFields.find(f => !body[f.field]);
    if (missingField) {
      return c.json({ error: `Falta ${missingField.name}` }, 400);
    }

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
          name,
          email,
          phone,
          facturaId: generarCodigo(),
          address,
          dni,
          subTotal,
          isPrinted,
          total,
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

      return c.json(factura);
    } catch (error) {
      return c.json({ error: "Error al procesar la factura", date: error });
    }
  });

  return newRouter;
};
