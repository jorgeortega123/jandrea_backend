import { Hono } from "hono";
import prismaClients from "./lib/prismaClients";
import { getProducts } from "../routes/getProducts";
import { Bindings } from "../types/types";
import { invoice } from "../routes/invoice";

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", async (c) => {
  const prisma = await prismaClients.fetch(c.env.DB);
  // const res = await prisma.user.create({
  //   data: {
  //     email: "fdhbvxfj",
  //   },
  // });
  // return c.json({ res });
  c.json({ text: "hi" });
});
app.route("/invoice", invoice());
app.route("/getProducts", getProducts());

export default app;
