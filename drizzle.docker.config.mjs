// Drizzle config for Docker runtime migrations
// Plain ESM — no drizzle-kit import needed
export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./data/labitat.db",
  },
}
