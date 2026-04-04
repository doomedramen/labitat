import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3"
import Database from "better-sqlite3"
import fs from "fs"
import path from "path"
import * as schema from "./schema"

type Db = BetterSQLite3Database<typeof schema>

function initDb(): Db {
  const dbUrl = process.env.DATABASE_URL ?? "file:./data/labitat.db"
  const dbPath = dbUrl.replace(/^file:/, "")
  const dbDir = path.dirname(path.resolve(dbPath))

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  const sqlite = new Database(dbPath)
  sqlite.pragma("journal_mode = WAL")
  sqlite.pragma("foreign_keys = ON")
  return drizzle(sqlite, { schema })
}

export const db = new Proxy({} as Db, {
  get(_target, prop) {
    return initDb()[prop as keyof Db]
  },
})
