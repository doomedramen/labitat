/**
 * Import data exported from the main branch into this database.
 * Usage: node scripts/import-data.mjs <export-file>
 *
 * This will REPLACE all existing data in the target database.
 * Tables are cleared in dependency order (items before groups).
 */
import { drizzle } from "drizzle-orm/better-sqlite3"
import Database from "better-sqlite3"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { users, groups, items, settings } from "../src/lib/db/schema.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const exportFile = process.argv[2]

if (!exportFile) {
  console.error("Usage: node scripts/import-data.mjs <export-file>")
  process.exit(1)
}

const resolvedExportFile = path.resolve(exportFile)
if (!fs.existsSync(resolvedExportFile)) {
  console.error(`Export file not found: ${resolvedExportFile}`)
  process.exit(1)
}

const dbUrl = process.env.DATABASE_URL ?? "file:./data/labitat.db"
const dbPath = dbUrl.replace(/^file:/, "")

console.log(`Importing data from ${resolvedExportFile} into ${dbPath}...`)

// Read export file
const rawData = fs.readFileSync(resolvedExportFile, "utf-8")
const data = JSON.parse(rawData)

console.log(`Found in export:`)
console.log(`  Users: ${data.users?.length ?? 0}`)
console.log(`  Groups: ${data.groups?.length ?? 0}`)
console.log(`  Items: ${data.items?.length ?? 0}`)
console.log(`  Settings: ${data.settings?.length ?? 0}`)

// Open database
const sqlite = new Database(dbPath)
sqlite.pragma("journal_mode = WAL")
sqlite.pragma("foreign_keys = OFF") // Disable during import for ordering

const db = drizzle(sqlite)

// Begin transaction
sqlite.exec("BEGIN TRANSACTION")

try {
  // Clear existing data in dependency order
  console.log("\nClearing existing data...")
  db.delete(items).run()
  db.delete(groups).run()
  db.delete(users).run()
  db.delete(settings).run()

  // Import users
  if (data.users?.length) {
    console.log(`Importing ${data.users.length} users...`)
    db.insert(users).values(data.users).run()
  }

  // Import groups
  if (data.groups?.length) {
    console.log(`Importing ${data.groups.length} groups...`)
    db.insert(groups).values(data.groups).run()
  }

  // Import items
  if (data.items?.length) {
    console.log(`Importing ${data.items.length} items...`)
    db.insert(items).values(data.items).run()
  }

  // Import settings
  if (data.settings?.length) {
    console.log(`Importing ${data.settings.length} settings...`)
    db.insert(settings).values(data.settings).run()
  }

  sqlite.exec("COMMIT")
  sqlite.pragma("foreign_keys = ON")

  console.log("\nImport complete!")
} catch (error) {
  sqlite.exec("ROLLBACK")
  sqlite.pragma("foreign_keys = ON")
  console.error("\nImport failed:", error.message)
  process.exit(1)
}

sqlite.close()
