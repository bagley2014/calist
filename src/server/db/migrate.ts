import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { sqlite } from "./client";

const migrationsDir = fileURLToPath(new URL("./migrations", import.meta.url));

export async function runMigrations() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS __migrations (
      id TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    )
  `);

  const appliedRows = sqlite
    .query("SELECT id FROM __migrations")
    .all() as Array<{ id: string }>;
  const applied = new Set(appliedRows.map((row) => row.id));

  const files = (await readdir(migrationsDir))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();

  for (const fileName of files) {
    if (applied.has(fileName)) {
      continue;
    }

    const sql = await readFile(join(migrationsDir, fileName), "utf8");
    sqlite.exec(sql);
    sqlite
      .query("INSERT INTO __migrations (id, applied_at) VALUES (?, ?)")
      .run(fileName, Math.floor(Date.now() / 1000));
  }
}

if (import.meta.main) {
  await runMigrations();
  console.log("Applied SQLite migrations.");
}
