import type { FastifyInstance } from "fastify";
import { generateApiKey, getConfigValue, setConfigValue } from "../auth";

function buildExportUrl(request: { protocol: string; host: string }, apiKey: string) {
  return `${request.protocol}://${request.host}/api/export/calendar.ics?apiKey=${apiKey}`;
}

export async function registerSettingsRoutes(app: FastifyInstance) {
  app.get("/settings", async (request, reply) => {
    const apiKey = await getConfigValue("icsApiKey");
    if (!apiKey) {
      return reply.status(500).send({ error: "ICS API key missing." });
    }

    const lookbackDays = Number.parseInt((await getConfigValue("lookbackDays")) ?? "30", 10);

    return {
      apiKey,
      exportUrl: buildExportUrl(request, apiKey),
      lookbackDays,
    };
  });

  app.post("/settings/ics-key/regenerate", async (request) => {
    const apiKey = generateApiKey();
    await setConfigValue("icsApiKey", apiKey);
    return {
      apiKey,
      exportUrl: buildExportUrl(request, apiKey),
    };
  });
}
