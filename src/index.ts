import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { isPrismaTimeout } from "./lib/prismaClients";
import { getProducts } from "../routes/getProducts";
import { Bindings } from "../types/types";
import { cors } from "hono/cors";
import newRouter from "../routes/invoice";
import newRouterProducts from "../routes/products";
import newRouterCategories from "../routes/categories";
import newRouterImages from "../routes/images";
import newRouterVideos from "../routes/videos";
import newRouterRespuestas from "../routes/mensajes";
import newRouterClub from "../routes/club";
import galeriaRouter from "../routes/galeria";
import coleccionesRouter from "../routes/colecciones";
import contabilidadRouter from "../routes/contabilidad";
import downloadRouter from "../routes/download";
import authRouter from "../routes/auth";
import userRouter from "../routes/user";
import ordersRouter from "../routes/orders";
import searchRouter from "../routes/search";
import leadsRouter from "../routes/leads";

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return "";
      try {
        const url = new URL(origin);
        if (url.hostname === "jandrea.art" || url.hostname.endsWith(".jandrea.art")) {
          return origin;
        }
      } catch {}
      if (origin === "http://localhost:3000" || origin === "http://localhost") {
        return origin;
      }
      return "";
    },
    allowMethods: ["GET", "POST", "OPTIONS", "PATCH", "DELETE", "PUT"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
// const validarClave = async (c: Context, next: Next) => {
//   const clave = c.req.header("x-api-key"); // clave enviada en header
//   if (clave === "03080308") {
//     await next(); // Deja pasar
//   } else {
//     return c.json({ error: "No autorizado" }, 401);
//   }
// };

app.get("/", (c) => c.json({ text: "Hi" }));

// Prisma atascado (ver src/lib/prismaClients.tsx): responder 503 en vez de
// dejar la petición colgada. El resto conserva el 500 por defecto de Hono.
app.onError((err, c) => {
  if (isPrismaTimeout(err)) {
    console.error("[Prisma Timeout]", c.req.method, c.req.path, err.message);
    return c.json(
      { success: false, message: "Servicio ocupado, intenta de nuevo en unos segundos." },
      503
    );
  }
  if (err instanceof HTTPException) return err.getResponse();
  console.error(err);
  return c.text("Internal Server Error", 500);
});
app.route("/invoice", newRouter);
app.route("/products", newRouterProducts);
app.route("/categories", newRouterCategories);
app.route("/images", newRouterImages);
app.route("/videos", newRouterVideos);
app.route("/respuestas", newRouterRespuestas);
app.route("/club", newRouterClub);
app.route("/gallery", galeriaRouter);
app.route("/colecciones", coleccionesRouter);
app.route("/contabilidad", contabilidadRouter);
app.route("/csv", downloadRouter);
app.route("/api/auth", authRouter);
app.route("/api/user", userRouter);
app.route("/api/orders", ordersRouter);
app.route("/search", searchRouter);
app.route("/leads", leadsRouter);

export default app;
