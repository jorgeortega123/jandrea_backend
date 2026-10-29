import { Hono } from "hono";
import prismaClients from "./lib/prismaClients";
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

app.get("/", async (c) => {
  c.json({ text: "Hi" });
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

export default app;
