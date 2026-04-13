import type { FastifyInstance } from "fastify";
import { RRule } from "rrule";
import { db } from "../db/client";
import { itemsTable } from "../db/schema";
import { getConfigValue } from "../auth";

function escapeIcsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function formatUtcDateTime(timestampSeconds: number) {
  return new Date(timestampSeconds * 1000).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function formatAllDayDate(timestampSeconds: number) {
  return new Date(timestampSeconds * 1000).toISOString().slice(0, 10).replaceAll("-", "");
}

function parseExceptions(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is number => typeof entry === "number") : [];
  } catch {
    return [];
  }
}

export async function registerExportRoutes(app: FastifyInstance) {
  app.get("/api/export/calendar.ics", async (request, reply) => {
    const query = request.query as { apiKey?: string };
    const apiKey = await getConfigValue("icsApiKey");

    if (!apiKey || query.apiKey !== apiKey) {
      return reply.status(401).send({ error: "Invalid API key." });
    }

    const lookbackDays = Number.parseInt((await getConfigValue("lookbackDays")) ?? "30", 10);
    const minTimestamp = Math.floor(Date.now() / 1000) - lookbackDays * 24 * 60 * 60;

    const rows = await db.select().from(itemsTable);
    const items = rows.filter((item) => !item.completed);

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//GitHub Copilot//Personal Scheduler//EN",
      "CALSCALE:GREGORIAN",
      "X-WR-CALNAME:Personal Scheduler",
    ];

    for (const item of items) {
      if (item.startsAt !== null && item.startsAt < minTimestamp && !item.rrule) {
        continue;
      }

      if (item.startsAt === null) {
        lines.push("BEGIN:VTODO");
        lines.push(`UID:${item.id}@scheduler`);
        lines.push(`SUMMARY:${escapeIcsText(item.title)}`);
        if (item.notes) {
          lines.push(`DESCRIPTION:${escapeIcsText(item.notes)}`);
        }
        lines.push(`STATUS:${item.completed ? "COMPLETED" : "NEEDS-ACTION"}`);
        lines.push(`CREATED:${formatUtcDateTime(item.createdAt)}`);
        lines.push(`LAST-MODIFIED:${formatUtcDateTime(item.updatedAt)}`);
        lines.push("END:VTODO");
        continue;
      }

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${item.id}@scheduler`);
      lines.push(`SUMMARY:${escapeIcsText(item.title)}`);
      if (item.notes) {
        lines.push(`DESCRIPTION:${escapeIcsText(item.notes)}`);
      }
      lines.push(`DTSTAMP:${formatUtcDateTime(item.updatedAt)}`);
      lines.push(`LAST-MODIFIED:${formatUtcDateTime(item.updatedAt)}`);
      lines.push(`CREATED:${formatUtcDateTime(item.createdAt)}`);

      if (item.isAllDay) {
        lines.push(`DTSTART;VALUE=DATE:${formatAllDayDate(item.startsAt)}`);
        if (item.endsAt) {
          lines.push(`DTEND;VALUE=DATE:${formatAllDayDate(item.endsAt)}`);
        }
      } else {
        lines.push(`DTSTART:${formatUtcDateTime(item.startsAt)}`);
        if (item.endsAt) {
          lines.push(`DTEND:${formatUtcDateTime(item.endsAt)}`);
        }
      }

      if (item.rrule) {
        const normalized = item.rrule.startsWith("RRULE:") ? item.rrule : `RRULE:${item.rrule}`;
        lines.push(normalized);

        const exceptions = parseExceptions(item.exceptions);
        if (exceptions.length > 0) {
          lines.push(`EXDATE:${exceptions.map((value) => formatUtcDateTime(value)).join(",")}`);
        }

        try {
          const rule = new RRule({
            ...RRule.parseString(item.rrule.replace(/^RRULE:/, "")),
            dtstart: new Date(item.startsAt * 1000),
          });
          const futureOccurrence = rule.after(new Date(), true);
          if (!futureOccurrence && item.startsAt < minTimestamp) {
            lines.pop();
          }
        } catch {
          // Keep the stored rule if parsing fails; the feed remains valid.
        }
      }

      lines.push("END:VEVENT");
    }

    lines.push("END:VCALENDAR");

    reply.header("Content-Type", "text/calendar; charset=utf-8");
    return reply.send(`${lines.join("\r\n")}\r\n`);
  });
}
