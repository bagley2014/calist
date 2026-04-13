import type { FastifyInstance } from "fastify";
import {
  clearSession,
  delayFailedLogin,
  generateApiKey,
  generateConfigSecret,
  getConfigValue,
  hashPassword,
  isSetupComplete,
  issueSession,
  setConfigValue,
  verifyPassword,
} from "../auth";

function readPassword(body: unknown) {
  const password = typeof body === "object" && body !== null ? (body as { password?: unknown }).password : undefined;
  return typeof password === "string" ? password.trim() : "";
}

export async function registerAuthRoutes(app: FastifyInstance) {
  app.get("/api/setup/status", async () => {
    return {
      isConfigured: await isSetupComplete(),
    };
  });

  app.post("/api/setup", async (request, reply) => {
    if (await isSetupComplete()) {
      return reply.status(409).send({ error: "Setup already completed." });
    }

    const password = readPassword(request.body);
    if (password.length < 8) {
      return reply.status(400).send({ error: "Password must be at least 8 characters." });
    }

    await setConfigValue("passwordHash", await hashPassword(password));
    await setConfigValue("sessionSecret", generateConfigSecret());
    await setConfigValue("icsApiKey", generateApiKey());
    await setConfigValue("lookbackDays", "30");

    await issueSession(reply);
    return reply.send({ ok: true });
  });

  app.post("/api/login", async (request, reply) => {
    const passwordHash = await getConfigValue("passwordHash");
    if (!passwordHash) {
      return reply.status(428).send({ error: "Run setup before logging in." });
    }

    const password = readPassword(request.body);
    const isValid = password ? await verifyPassword(password, passwordHash) : false;
    if (!isValid) {
      await delayFailedLogin();
      return reply.status(401).send({ error: "Incorrect password." });
    }

    await issueSession(reply);
    return reply.send({ ok: true });
  });

  app.post("/api/logout", async (_, reply) => {
    clearSession(reply);
    return reply.send({ ok: true });
  });
}
