import { Hono } from "hono";
import { Bindings } from "../types/types";
import prismaClients from "../src/lib/prismaClients";

const downloadRouter = new Hono<{ Bindings: Bindings }>();

// Función para convertir datos a formato CSV
function convertirACSV(data: any[]): string {
  if (data.length === 0) return "";

  // Cabeceras del CSV
  const headers = [
    "id",
    "title",
    "description",
    "price",
    "condition",
    "link",
    "image_link",
    "availability",
    "brand",
  ];

  // Crear línea de cabeceras
  const csvHeaders = headers.join(",");

  // Crear líneas de datos
  const csvRows = data.map((row) => {
    return headers
      .map((header) => {
        const value = row[header] || "";
        // Escapar comillas y envolver en comillas si contiene comas o saltos de línea
        const stringValue = String(value);
        if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(",");
  });

  return [csvHeaders, ...csvRows].join("\n");
}

// Endpoint para descargar productos en formato CSV
downloadRouter.get("/download", async (c) => {
  try {
    const prisma = await prismaClients.fetch(c.env.DB);

    // Obtener todos los productos con sus variantes e imágenes
    const productos = await prisma.producto.findMany({
      include: {
        variants: {
          include: {
            images: true,
          },
        },
        categoria: true,
      },
    });

    // Transformar los productos al formato CSV
    const productosCSV = productos.flatMap((producto) => {
      // Si el producto tiene variantes, crear una fila por cada variante
      if (producto.variants && producto.variants.length > 0) {
        return producto.variants.map((variant) => {
          const todasImagenes = variant.images?.map((img) => img.src).join("|") || "";

          return {
            id: producto.identificador || producto.id,
            title: `${producto.title || ""} - ${variant.description || ""}`.trim(),
            description: producto.description || "",
            price: `${variant.price || 0} USD`,
            condition: "new",
            link: `https://jandrea.art/products/${producto.identificador || producto.id}`,
            image_link: todasImagenes,
            availability: producto.inStock ? "in stock" : "out of stock",
            brand: "Jandrea art",
          };
        });
      } else {
        // Si no tiene variantes, crear una sola fila con el producto base
        return {
          id: producto.identificador || producto.id,
          title: producto.title || "",
          description: producto.description || "",
          price: `${producto.price || 0} USD`,
          condition: "new",
          link: `https://jandrea.art/products/${producto.identificador || producto.id}`,
          image_link: "",
          availability: producto.inStock ? "in stock" : "out of stock",
          brand: "Jandrea art",
        };
      }
    });

    // Convertir a CSV
    const csv = convertirACSV(productosCSV);

    // Retornar el CSV como descarga
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="productos_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error al generar CSV:", error);
    return c.json(
      {
        success: false,
        error: "Error al generar el archivo CSV",
        details: error,
      },
      500
    );
  }
});

// Endpoint alternativo para obtener productos en formato JSON (para previsualización)
downloadRouter.get("/products/preview", async (c) => {
  try {
    const prisma = await prismaClients.fetch(c.env.DB);
    const limit = parseInt(c.req.query("limit") || "10");

    const productos = await prisma.producto.findMany({
      take: limit,
      include: {
        variants: {
          include: {
            images: true,
          },
        },
        categoria: true,
      },
    });

    const productosFormateados = productos.flatMap((producto) => {
      if (producto.variants && producto.variants.length > 0) {
        return producto.variants.map((variant) => {
          const todasImagenes = variant.images?.map((img) => img.src).join("|") || "";

          return {
            id: producto.identificador || producto.id,
            title: `${producto.title || ""} - ${variant.description || ""}`.trim(),
            description: producto.description || "",
            price: `${variant.price || 0} USD`,
            condition: "new",
            link: `https://jandrea.art/products/${producto.identificador || producto.id}`,
            image_link: todasImagenes,
            availability: producto.inStock ? "in stock" : "out of stock",
            brand: "Jandrea art",
          };
        });
      } else {
        return {
          id: producto.identificador || producto.id,
          title: producto.title || "",
          description: producto.description || "",
          price: `${producto.price || 0} USD`,
          condition: "new",
          link: `https://jandrea.art/products/${producto.identificador || producto.id}`,
          image_link: "",
          availability: producto.inStock ? "in stock" : "out of stock",
          brand: "Jandrea art",
        };
      }
    });

    return c.json({
      success: true,
      total: productosFormateados.length,
      productos: productosFormateados,
    });
  } catch (error) {
    console.error("Error al obtener preview:", error);
    return c.json(
      {
        success: false,
        error: "Error al obtener la vista previa",
        details: error,
      },
      500
    );
  }
});

export default downloadRouter;
