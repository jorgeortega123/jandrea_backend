import { Hono } from "hono";
import prismaClients from "./lib/prismaClients";
import { getProducts } from "../routes/getProducts";
import { Bindings } from "../types/types";
import { cors } from "hono/cors";
import newRouter from "../routes/invoice";

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "*",
  cors({
    origin: (origin) => {
      const allowedOrigins = [
        "https://jandrea.art",
        "https://www.jandrea.art",
        "http://localhost:3000",
      ];
      return allowedOrigins.includes(origin ?? "") ? origin : "";
    },
    allowMethods: ["GET", "POST", "OPTIONS", "PATCH"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/", async (c) => {
  const prisma = await prismaClients.fetch(c.env.DB);
  // const res = await prisma.user.create({
  //   data: {
  //     email: "fdhbvxfj",
  //   },
  // });
  // return c.json({ res });
  c.json({ text: "Hi" });
});
app.route("/invoice", newRouter);
app.route("/getProducts", getProducts());

export default app;
