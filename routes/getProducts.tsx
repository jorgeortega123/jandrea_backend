import { Hono } from "hono";
import prismaClients from "../src/lib/prismaClients";
import { Bindings } from "../types/types";

const newRouter = new Hono<{ Bindings: Bindings }>();

export const getProducts = () => {
  newRouter.get(
    "/getProductsByCategory/:category/:count/:offset",
    async (c, next) => {
      const prisma = await prismaClients.fetch(c.env.DB);
      const category = c.req.param("category");
      const count = c.req.param("count");
      const offset = c.req.param("offset");
    }
  );
  return newRouter;
};
