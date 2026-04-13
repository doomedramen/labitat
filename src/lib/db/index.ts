import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import * as schema from "./schema";
import { env } from "@/lib/env";

type Db = BetterSQLite3Database<typeof schema>;

let _db: Db | null = null;

/**
 * Initialize the SQLite database connection.
 * Creates the database directory if it doesn't exist.
 */
function initDb(): Db {
  if (_db) return _db;

  const dbPath = env.DATABASE_URL.replace(/^file:/, "");
  const dbDir = path.dirname(path.resolve(dbPath));

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  _db = drizzle(sqlite, { schema });
  return _db;
}

/**
 * Lazy-initialized database proxy.
 * Defers connection until first use to avoid issues during build/SSG.
 */
export const db = new Proxy({} as Db, {
  get(_target, prop) {
    return initDb()[prop as keyof Db];
  },
});
