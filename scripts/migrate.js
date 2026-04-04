/**
 * Run pending database migrations at startup.
 * Usage: node scripts/migrate.js
 */
import { drizzle } from "drizzle-orm/better-sqlite3"
import Database from "better-sqlite3"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbUrl = process.env.DATABASE_URL ?? "file:./data/labitat.db"
const dbPath = dbUrl.replace(/^file:/, "")
const dbDir = path.dirname(path.resolve(dbPath))

// Ensure database directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

console.log(`Running migrations on ${dbPath}...`)

const sqlite = new Database(dbPath)
sqlite.pragma("journal_mode = WAL")
sqlite.pragma("foreign_keys = ON")

const db = drizzle(sqlite)

// Migrations folder — resolve relative to this script's parent directory
const migrationsFolder = path.resolve(__dirname, "../lib/db/migrations")

migrate(db, { migrationsFolder })

console.log("Migrations complete.")

sqlite.close()
