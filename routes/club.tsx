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
    const { code, nombre, email, telefono } = await c.req.json();

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

    // 2. Verificar que el cupón no ha sido usado
    if ((factura as any).isUsedCupon === true) {
      return c.json(
        { success: false, error: "Este cupón ya ha sido utilizado" },
        400
      );
    }

    // 3. Obtener la cédula de la factura
    const cedulaFactura = factura.dni?.toString() || null;

    if (!cedulaFactura || cedulaFactura === "0") {
      return c.json(
        {
          success: false,
          error: "La factura no tiene una cédula válida asociada",
        },
        400
      );
    }

    // 4. Buscar el usuario por la cédula de la factura
    let usuario = await prisma.usuarioClub.findFirst({
      where: { cedula: cedulaFactura },
    });

    // Si no existe el usuario, crearlo con los datos de la factura
    if (!usuario) {
      usuario = await prisma.usuarioClub.create({
        data: {
          nombre: nombre || factura.name,
          email: email || factura.email || null,
          telefono: telefono || factura.phone?.toString() || null,
          cedula: cedulaFactura,
          nivel: 1,
          avance: 2,
        },
      });
    }

    // 5. Actualizar el avance del usuario (sumar 1)
    const usuarioActualizado = await prisma.usuarioClub.update({
      where: { id: usuario.id },
      data: {
        avance: (usuario.avance || 2) + 1,
      },
    });

    // 6. Marcar la factura como usada
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
        email: usuarioActualizado.email ?? "defaul@jandrea.art",
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

// Endpoint para obtener el progreso de un usuario por cédula
newRouterClub.get("/obtener-progreso", async (c) => {
  const prisma = await prismaClients.fetch(c.env.DB);
  const cedula = c.req.query("cedula");

  if (!cedula) {
    return c.json(
      { success: false, error: "El parámetro 'cedula' es requerido" },
      400
    );
  }

  try {
    const usuario = await prisma.usuarioClub.findFirst({
      where: { cedula: cedula },
    });

    if (!usuario) {
      return c.json(
        { success: false, error: "Usuario no encontrado" },
        404
      );
    }

    return c.json({
      success: true,
      usuario: {
        cedula: usuario.cedula,
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email ?? "default@jandrea.art",
        avance: usuario.avance,
        nivel: usuario.nivel,
      },
    });
  } catch (error) {
    console.error(error);
    return c.json(
      { success: false, error: "Error al obtener el progreso del usuario" },
      500
    );
  }
});

export default newRouterClub;
