import { Hono } from "hono";
import { Bindings } from "../types/types";

const newRouterVideos = new Hono<{ Bindings: Bindings }>();

// Subida de un solo video
newRouterVideos.post("/upload", async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("video");

  if (!(file instanceof File)) {
    return c.json({ error: "No se envió un video" }, 400);
  }
  if (!file.name.match(/\.mp4$/i)) {
    return c.json({ error: "Formato no soportado, solo mp4" }, 400);
  }

  const key = crypto.randomUUID();

  await c.env.MY_BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: "video/mp4" },
  });

  return c.json({
    message: "Video subido",
    key,
    url: `${c.req.url.replace(/\/upload$/, "")}/video/${key}`,
  });
});

// Obtener video
newRouterVideos.get("/video/:key", async (c) => {
  const key = c.req.param("key");
  const obj = await c.env.MY_BUCKET.get(key);

  if (!obj) return c.json({ error: "No encontrado" }, 404);

  return new Response(obj.body, {
    headers: { "Content-Type": "video/mp4" },
  });
});

// Subida múltiple de videos
newRouterVideos.post("/upload/multiple", async (c) => {
  const formData = await c.req.formData();
  const files = formData
    .getAll("videos")
    .filter((f) => f instanceof File) as File[];

  if (files.length === 0) {
    return c.json({ error: "No se enviaron videos" }, 400);
  }

  const results = await Promise.all(
    files.map(async (file) => {
      if (!file.name.match(/\.mp4$/i)) {
        return { error: `Formato no soportado: ${file.name}` };
      }

      const key = crypto.randomUUID();

      await c.env.MY_BUCKET.put(key, await file.arrayBuffer(), {
        httpMetadata: { contentType: "video/mp4" },
      });

      return {
        key,
        url: `${c.req.url.replace(/\/upload$/, "")}/video/${key}`,
      };
    })
  );

  return c.json({ message: "Videos subidos", files: results });
});

export default newRouterVideos;
