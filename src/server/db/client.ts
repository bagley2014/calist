import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";

const dataDir = resolve(process.cwd(), "data");
mkdirSync(dataDir, { recursive: true });

const databaseFile = resolve(dataDir, "scheduler.db");

export const sqlite = new Database(databaseFile, { create: true });
sqlite.exec("PRAGMA journal_mode = WAL;");

export const db = drizzle({ client: sqlite, schema });
