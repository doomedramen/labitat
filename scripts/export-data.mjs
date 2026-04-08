/**
 * Export all data from the database to a JSON file.
 * Usage: node scripts/export-data.mjs [output-file]
 * Default output: ./export.json
 */
import { drizzle } from "drizzle-orm/better-sqlite3"
import Database from "better-sqlite3"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { users, groups, items, settings } from "../lib/db/schema.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbUrl = process.env.DATABASE_URL ?? "file:./data/labitat.db"
const dbPath = dbUrl.replace(/^file:/, "")

console.log(`Exporting data from ${dbPath}...`)

const sqlite = new Database(dbPath, { readonly: true })
sqlite.pragma("journal_mode = WAL")
sqlite.pragma("foreign_keys = ON")

const db = drizzle(sqlite)

// Export all tables
const data = {
  version: "1.0.0",
  exportedAt: new Date().toISOString(),
  users: db.select().from(users).all(),
  groups: db.select().from(groups).all(),
  items: db.select().from(items).all(),
  settings: db.select().from(settings).all(),
}

// Determine output file
const outputFile = process.argv[2] ?? path.resolve(__dirname, "export.json")

// Ensure output directory exists
const outputDir = path.dirname(outputFile)
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// Write to file
fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), "utf-8")

console.log(`\nExport complete!`)
console.log(`  Users: ${data.users.length}`)
console.log(`  Groups: ${data.groups.length}`)
console.log(`  Items: ${data.items.length}`)
console.log(`  Settings: ${data.settings.length}`)
console.log(`\nSaved to: ${outputFile}`)

sqlite.close()
