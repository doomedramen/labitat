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
const migrationsFolder = path.resolve(__dirname, "../drizzle")

// Skip if migrations folder doesn't exist
if (!fs.existsSync(migrationsFolder)) {
  console.log("No migrations folder found. Skipping migrations.")
  sqlite.close()
  process.exit(0)
}

// Read migration journal
const journalPath = path.join(migrationsFolder, "meta", "_journal.json")
const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"))

// Run migrations
try {
  migrate(db, { migrationsFolder })
  console.log("Migrations complete.")
} catch (err) {
  if (err.message && err.message.includes("already exists")) {
    console.log(
      "Schema already applied, ensuring migrations tracking table exists..."
    )
    // Ensure tracking table exists
    sqlite
      .prepare(
        "CREATE TABLE IF NOT EXISTS __drizzle_migrations (version TEXT PRIMARY KEY, applied_at TEXT DEFAULT (current_timestamp))"
      )
      .run()
    // Mark all journal entries as applied
    const insertStmt = sqlite.prepare(
      "INSERT OR IGNORE INTO __drizzle_migrations (version) VALUES (?)"
    )
    for (const entry of journal.entries) {
      insertStmt.run(entry.tag)
    }
    console.log("Migrations tracking updated.")
  } else {
    throw err
  }
}

sqlite.close()
