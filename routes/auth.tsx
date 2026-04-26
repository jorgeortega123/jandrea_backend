import { Hono } from "hono";
import { Bindings } from "../types/types";
import { createAuth } from "../src/lib/auth";

const authRouter = new Hono<{ Bindings: Bindings }>();

authRouter.all("/*", async (c) => {
  try {
    const auth = createAuth(c.env.DB, c.env);
    const response = await auth.handler(c.req.raw);
    return response;
  } catch (error: any) {
    console.error("[Auth Error]", error);
    return c.json(
      {
        success: false,
        message: error?.message || "Error interno de autenticación",
        stack: error?.stack?.split("\n").slice(0, 3),
      },
      500
    );
  }
});

export default authRouter;
