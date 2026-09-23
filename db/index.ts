import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";
let database: ReturnType<typeof connect> | undefined;
function connect() {
  const directory = process.env.DATA_DIR || path.join(process.cwd(), "data");
  if (process.env.RAILWAY_ENVIRONMENT_ID && directory !== "/data") throw new Error("Railway requires the persistent volume at /data");
  mkdirSync(directory, { recursive: true });
  const sqlite = new Database(path.join(directory, "portal.sqlite"));
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}
export function getDb() { return database ??= connect(); }
