import { Hono } from "hono";
import { Bindings } from "../types/types";
import prismaClients from "../src/lib/prismaClients";
import { Producto } from "../types/Product";

const newRouterClub = new Hono<{ Bindings: Bindings }>();

// Endpoint para verificar el cupón de una factura
newRouterClub.get("/verificar-factura", async (c) => {
  const prisma = await prismaClients.fetch(c.env.DB);
  const facturaId = c.req.query("id");

  if (!facturaId) {
    return c.json(
      { success: false, error: "El parámetro 'id' es requerido" },
      400
    );
  }

  try {
    const factura = await prisma.facturaSinInva.findFirst({
      where: { code: facturaId },
    });

    if (!factura) {
      return c.json({ success: false, error: "Factura no encontrada" }, 404);
    }

    // Verificar si el cupón es válido (no ha sido usado)
    const isValid = (factura as any).isUsedCupon === false;

    return c.json({
      nombre: factura.name,
      dni: factura.dni,
      valor: factura.total,

      isValid: isValid,
      expireCupon: factura.expireCupon,
    });
  } catch (error) {
    console.error(error);
    return c.json(
      { success: false, error: "Error al verificar el cupón" },
      500
    );
  }
});

// Endpoint para registrar una factura y sumar avance al usuario
newRouterClub.post("/registrar-factura", async (c) => {
  const prisma = await prismaClients.fetch(c.env.DB);

  try {
    const { id, code, nombre, email, telefono, cedula } = await c.req.json();

    if (!code) {
      return c.json(
        { success: false, error: "El campo 'code' es requerido" },
        400
      );
    }

    // 1. Verificar que la factura existe con ese code
    const factura = await prisma.facturaSinInva.findFirst({
      where: { code: code },
    });

    if (!factura) {
      return c.json({ success: false, error: "Factura no encontrada" }, 404);
    }

    if (factura.dni != 0 && factura.dni !== cedula) {
      return c.json(
        {
          success: false,
          error:
            "No se puede acreditar el avance a otro cédula que no sea de la factura",
        },
        404
      );
    }

    // 2. Verificar que el cupón no ha sido usado
    if ((factura as any).isUsedCupon === true) {
      return c.json(
        { success: false, error: "Este cupón ya ha sido utilizado" },
        400
      );
    }

    // 3. Buscar o crear el usuario
    let usuario = null;

    if (id) {
      // Si se proporciona ID, buscar por ID
      usuario = await prisma.usuarioClub.findUnique({
        where: { id: id },
      });
    } else if (email) {
      // Si no hay ID pero hay email, buscar por email
      usuario = await prisma.usuarioClub.findUnique({
        where: { email: email },
      });
    }

    // Si no existe el usuario, crearlo
    if (!usuario) {
      if (!nombre || !email) {
        return c.json(
          {
            success: false,
            error:
              "Para crear un nuevo usuario se requieren 'nombre' y 'email'",
          },
          400
        );
      }

      usuario = await prisma.usuarioClub.create({
        data: {
          nombre: nombre,
          email: email,
          telefono: telefono || null,
          cedula: cedula || null,
          nivel: 1,
          avance: 0,
        },
      });
    }

    // 4. Actualizar el avance del usuario (sumar 1)
    const usuarioActualizado = await prisma.usuarioClub.update({
      where: { id: usuario.id },
      data: {
        avance: (usuario.avance || 0) + 1,
      },
    });

    // 5. Marcar la factura como usada
    await prisma.facturaSinInva.update({
      where: { id: factura.id },
      data: {
        isUsedCupon: true,
      },
    });

    return c.json({
      success: true,
      message: "Factura registrada exitosamente",
      usuario: {
        cedula: usuarioActualizado.cedula,
        id: usuarioActualizado.id,
        nombre: usuarioActualizado.nombre,
        email: usuarioActualizado.email,
        avance: usuarioActualizado.avance,
        nivel: usuarioActualizado.nivel,
      },
    });
  } catch (error) {
    console.error(error);
    return c.json(
      { success: false, error: "Error al registrar la factura" },
      500
    );
  }
});

export default newRouterClub;
