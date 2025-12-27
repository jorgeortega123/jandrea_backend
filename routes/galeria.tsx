import { Hono } from "hono";
import { Bindings } from "../types/types";
import prismaClients from "../src/lib/prismaClients";
import { Producto } from "../types/Product";

const galeriaRouter = new Hono<{ Bindings: Bindings }>();

// Subir una imagen individual
galeriaRouter.post("/upload", async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("imagen");
  const description = formData.get("description") as string;

  if (!(file instanceof File)) {
    return c.json({ error: "No se envió una imagen" }, 400);
  }

  if (!file.name.match(/\.(jpg|jpeg|png|gif|webp|mp4)$/i)) {
    return c.json({ error: "Formato de imagen no soportado" }, 400);
  }

  const uniqueKey = `${crypto.randomUUID()}`;

  // Subir imagen al bucket
  await c.env.MY_BUCKET.put(uniqueKey, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  const imageUrl = `${c.req.url.replace(/\/upload$/, "")}/image/${uniqueKey}`;

  // Guardar en base de datos
  const prisma = await prismaClients.fetch(c.env.DB);
  const newImage = await prisma.imageFromGallery.create({
    data: {
      src: imageUrl,
      description: description || null,
     // isVideo: file.type.startsWith("video/"),
    },
  });

  return c.json({
    message: "Imagen subida exitosamente",
    image: newImage,
  });
});

// Subir múltiples imágenes
galeriaRouter.post("/upload/multiple", async (c) => {
  const formData = await c.req.formData();
  const files = formData
    .getAll("imagenes")
    .filter((f) => f instanceof File) as File[];
  const descriptionsString = formData.get("descriptions") as string;

  if (files.length === 0) {
    return c.json({ error: "No se enviaron imágenes" }, 400);
  }

  let descriptions: (string | null)[] = [];
  if (descriptionsString) {
    try {
      descriptions = JSON.parse(descriptionsString);
    } catch (error) {
      return c.json({ error: "Formato de descripciones inválido" }, 400);
    }
  }

  const prisma = await prismaClients.fetch(c.env.DB);
  const results = await Promise.all(
    files.map(async (file, index) => {
      if (!file.name.match(/\.(jpg|jpeg|png|gif|webp|mp4)$/i)) {
        return { error: `Formato no soportado: ${file.name}` };
      }

      const key = crypto.randomUUID();

      // Subir imagen al bucket
      await c.env.MY_BUCKET.put(key, await file.arrayBuffer(), {
        httpMetadata: { contentType: file.type },
      });

      const imageUrl = `${c.req.url.replace(/\/upload\/multiple$/, "")}/image/${key}`;

      // Guardar en base de datos
      const newImage = await prisma.imageFromGallery.create({
        data: {
          src: imageUrl,
          description: descriptions[index] || null,
        },
      });

      return {
        success: true,
        image: newImage,
      };
    })
  );

  return c.json({
    message: "Imágenes subidas exitosamente",
    images: results,
  });
});

// Obtener imagen por key
galeriaRouter.get("/image/:key", async (c) => {
  const key = c.req.param("key");
  const obj = await c.env.MY_BUCKET.get(key);

  if (!obj) return c.json({ error: "Imagen no encontrada" }, 404);

  return new Response(obj.body, {
    headers: { "Content-Type": obj.httpMetadata?.contentType || "image/png" },
  });
});

// Obtener todas las imágenes de la galería con paginación
galeriaRouter.get("/all", async (c) => {
  const prisma = await prismaClients.fetch(c.env.DB);

  // Obtener parámetros de paginación desde query params
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "12");

  // Calcular skip
  const skip = (page - 1) * limit;

  // Obtener total de imágenes
  const totalImages = await prisma.imageFromGallery.count();

  // Obtener imágenes paginadas
  const images = await prisma.imageFromGallery.findMany({
    skip,
    take: limit,
    orderBy: {
      createdAt: "desc",
    },
  });

  // Calcular metadata de paginación
  const totalPages = Math.ceil(totalImages / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return c.json({
    images,
    pagination: {
      currentPage: page,
      totalPages,
      totalImages,
      limit,
      hasNextPage,
      hasPrevPage,
    },
  });
});

// Eliminar imagen
galeriaRouter.delete("/delete/:id", async (c) => {
  const id = c.req.param("id");
  const prisma = await prismaClients.fetch(c.env.DB);

  const image = await prisma.imageFromGallery.findUnique({
    where: { id },
  });

  if (!image) {
    return c.json({ error: "Imagen no encontrada" }, 404);
  }

  // Extraer key del URL
  const key = image.src.split("/image/")[1];
  if (key) {
    await c.env.MY_BUCKET.delete(key);
  }

  await prisma.imageFromGallery.delete({
    where: { id },
  });

  return c.json({ message: "Imagen eliminada exitosamente" });
});

galeriaRouter.post("/get", async (c) => {
  const body: Producto[] = await c.req.json();
  const prisma = await prismaClients.fetch(c.env.DB);
});

export default galeriaRouter;
