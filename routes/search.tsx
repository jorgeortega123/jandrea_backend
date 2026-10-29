import { Hono } from "hono";
import prismaClients from "../src/lib/prismaClients";
import { Bindings } from "../types/types";

const searchRouter = new Hono<{ Bindings: Bindings }>();

searchRouter.post("/", async (c) => {
  const prisma = await prismaClients.fetch(c.env.DB);

  try {
    const body = await c.req.json();
    const searchTerms: string[] = body.search;

    if (!searchTerms || !Array.isArray(searchTerms) || searchTerms.length === 0) {
      return c.json({ error: "Se requiere un array de términos en 'search'" }, 400);
    }

    // Construir condiciones OR: que coincida con cualquier término en title o description
    const orConditions = searchTerms.flatMap((term) => [
      { title: { contains: term } },
      { description: { contains: term } },
    ]);

    const page = parseInt(body.page || "1");
    const limit = parseInt(body.limit || "20");
    const skip = (page - 1) * limit;

    const productos = await prisma.producto.findMany({
      where: { OR: orConditions },
      skip,
      take: limit,
      include: {
        topicTags: true,
        variants: {
          select: {
            price: true,
            priceWithoutOff: true,
            images: {
              take: 2,
              select: { src: true },
            },
          },
        },
      },
    });

    const total = await prisma.producto.count({
      where: { OR: orConditions },
    });

    const hasNextPage = skip + productos.length < total;

    return c.json({ productos, total, page, limit, hasNextPage });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Error en la búsqueda" }, 500);
  }
});

export default searchRouter;
