import { chromium, type FullConfig } from "@playwright/test"
import { execSync } from "child_process"
import fs from "fs"
import path from "path"

const TEST_EMAIL = "admin@example.com"
const TEST_PASSWORD = "admin123"
const TEST_DB_PATH = path.join(process.cwd(), "data", "labitat.test.db")

function wipeTestDb() {
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH)
  }
  for (const suffix of ["-wal", "-shm"]) {
    const p = TEST_DB_PATH + suffix
    if (fs.existsSync(p)) fs.unlinkSync(p)
  }
}

async function globalSetup(config: FullConfig) {
  // Wipe the test database so every run starts from a clean slate
  wipeTestDb()

  // Run migrations on the fresh database
  execSync("pnpm db:push", { stdio: "inherit" })

  // Seed the admin user via the setup wizard
  const browser = await chromium.launch()
  const page = await browser.newPage()

  const baseURL = config.webServer?.url ?? "http://localhost:3000"
  await page.goto(baseURL + "/setup")

  await page.fill('input[name="email"]', TEST_EMAIL)
  await page.fill('input[name="password"]', TEST_PASSWORD)
  await page.fill('input[name="confirmPassword"]', TEST_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL("/")

  await browser.close()
}

async function globalTeardown() {
  wipeTestDb()
}

export { globalSetup as default, globalTeardown }
