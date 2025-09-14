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

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "*",
  cors({
    origin: (origin) => {
      const allowedOrigins = [
        "https://jandrea.art",
        "https://www.jandrea.art",
        "https://jorgeortega.vercel.app/",
      ];
      return allowedOrigins.includes(origin ?? "") ? origin : "";
    },
    allowMethods: ["GET", "POST", "OPTIONS", "PATCH", "DELETE", "PUT"],
    allowHeaders: ["Content-Type", "Authorization"],
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

export default app;
