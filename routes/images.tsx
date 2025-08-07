import { Hono } from "hono";
import prismaClients from "../src/lib/prismaClients";
import { Producto } from "../types/Product";
import { Bindings } from "../types/types";

const newRouterImages = new Hono<{ Bindings: Bindings }>();

newRouterImages.post("/upload", async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("imagen");

  if (!(file instanceof File)) {
    return c.json({ error: "No se envió una imagen" }, 400);
  }
  if (!file.name.match(/\.(jpg|jpeg|png|gif|webp|mp4)$/i)) {
    return c.json({ error: "Formato de imagen no soportado" }, 400);
  }
  // Puedes devolver la URL pública si tienes R2 con dominio público

  //   const extension = file.name.split(".").pop();
  const uniqueKey = `${crypto.randomUUID()}`;

  await c.env.MY_BUCKET.put(uniqueKey, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  return c.json({
    message: "Imagen subida",
    key: uniqueKey,
    url: `${c.req.url.replace(/\/upload$/, "")}/image/${uniqueKey}`,
  });
  //   return c.json({
  //     message: "Imagen subida",
  //     key: `https://jandrea-backend.database-jorge.workers.dev/images/image/${file.name}`,
  //   });
});

newRouterImages.get("/image/:key", async (c) => {
  const key = c.req.param("key");
  const obj = await c.env.MY_BUCKET.get(key);

  if (!obj) return c.json({ error: "No encontrada" }, 404);

  return new Response(obj.body, {
    headers: { "Content-Type": obj.httpMetadata?.contentType || "image/png" },
  });
});

newRouterImages.post("/upload/full", async (c) => {
  const formData = await c.req.formData();
  const files = formData
    .getAll("imagenes")
    .filter((f) => f instanceof File) as File[];

  if (files.length === 0) {
    return c.json({ error: "No se enviaron imágenes" }, 400);
  }

  const results = await Promise.all(
    files.map(async (file) => {
      if (!file.name.match(/\.(jpg|jpeg|png|gif|webp|mp4)$/i)) {
        return { error: `Formato no soportado: ${file.name}` };
      }

      const key = crypto.randomUUID();

      await c.env.MY_BUCKET.put(key, await file.arrayBuffer(), {
        httpMetadata: { contentType: file.type },
      });

      return {
        key,
        url: `${c.req.url.replace(/\/upload$/, "")}/image/${key}`,
      };
    })
  );

  return c.json({ message: "Imágenes subidas", files: results });
});

export default newRouterImages;
