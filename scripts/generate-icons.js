#!/usr/bin/env node

/**
 * Icon Generator Script
 * Generates all required icon sizes from logo.svg
 *
 * Usage: node scripts/generate-icons.js
 */

import sharp from "sharp"
import { mkdirSync, existsSync, copyFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT_DIR = join(__dirname, "..")

// Source SVG
const SOURCE_SVG = join(ROOT_DIR, "logo.svg")

// Define all required icon sizes
const ICONS = [
  // ── App (public/) ─────────────────────────────────────────────────────────
  // Favicon files
  { size: 16, output: "public/favicon-16x16.png" },
  { size: 32, output: "public/favicon-32x32.png" },
  { size: 32, output: "public/favicon.png" },
  { size: 32, output: "public/favicon.ico" },

  // Apple touch icons
  { size: 120, output: "public/apple-touch-icon-120x120.png" },
  { size: 152, output: "public/apple-touch-icon-152x152.png" },
  { size: 167, output: "public/apple-touch-icon-167x167.png" }, // iPad Pro
  { size: 180, output: "public/apple-touch-icon.png" },
  { size: 512, output: "public/apple-touch-icon-512x512.png" },
  { size: 1024, output: "public/apple-touch-icon-1024x1024.png" },

  // PWA icons (public/icons/)
  { size: 96, output: "public/icons/icon-96x96.png" },
  { size: 128, output: "public/icons/icon-128x128.png" },
  { size: 144, output: "public/icons/icon-144x144.png" },
  { size: 152, output: "public/icons/icon-152x152.png" },
  { size: 192, output: "public/icons/icon-192x192.png" },
  { size: 384, output: "public/icons/icon-384x384.png" },
  { size: 512, output: "public/icons/icon-512x512.png" },
  { size: 512, output: "public/icons/icon-maskable-512x512.png" },

  // ── Docs (docs/public/) ────────────────────────────────────────────────────
  { size: 32, output: "docs/public/favicon.ico" },
]

async function generateIcon(size, outputPath) {
  const relativePath = outputPath.replace(ROOT_DIR + "/", "")

  const outputDir = dirname(outputPath)
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  await sharp(SOURCE_SVG)
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(outputPath)

  console.log(`✓ ${relativePath} (${size}x${size})`)
}

async function main() {
  if (!existsSync(SOURCE_SVG)) {
    console.error(`Error: Source SVG not found at ${SOURCE_SVG}`)
    process.exit(1)
  }

  console.log("Generating icons from logo.svg...\n")

  // Copy source SVG to docs
  copyFileSync(SOURCE_SVG, join(ROOT_DIR, "docs/public/logo.svg"))
  console.log("✓ docs/public/logo.svg")

  for (const icon of ICONS) {
    await generateIcon(icon.size, join(ROOT_DIR, icon.output))
  }

  console.log("\nDone!")
}

main()
