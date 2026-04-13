import Fastify from "fastify";
import cookie from "@fastify/cookie";
import fastifyStatic from "@fastify/static";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { authenticateRequest } from "./auth";
import { runMigrations } from "./db/migrate";
import { registerAuthRoutes } from "./routes/auth";
import { registerExportRoutes } from "./routes/export";
import { registerItemRoutes } from "./routes/items";
import { registerSettingsRoutes } from "./routes/settings";

const app = Fastify({
  logger: true,
  trustProxy: true,
});

await runMigrations();

await app.register(cookie);
await registerAuthRoutes(app);
await registerExportRoutes(app);

await app.register(async (protectedApp) => {
  protectedApp.addHook("preHandler", authenticateRequest);
  await registerItemRoutes(protectedApp);
  await registerSettingsRoutes(protectedApp);
});

const clientRoot = resolve(process.cwd(), "dist/client");

if (existsSync(clientRoot)) {
  await app.register(fastifyStatic, {
    root: clientRoot,
    prefix: "/",
  });

  app.get("/*", async (_, reply) => {
    return reply.sendFile("index.html");
  });
} else {
  app.get("/", async (_, reply) => {
    reply.type("text/html");
    return reply.send(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Personal Scheduler</title>
        </head>
        <body style="font-family: sans-serif; padding: 2rem;">
          <h1>Personal Scheduler</h1>
          <p>Build the client with <code>bun run build</code> or run <code>bun run dev:client</code> during development.</p>
        </body>
      </html>
    `);
  });
}

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

await app.listen({
  host: "0.0.0.0",
  port,
});