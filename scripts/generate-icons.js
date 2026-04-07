#!/usr/bin/env node

/**
 * Icon Generator Script
 * Generates all required icon sizes from logo.svg
 *
 * Usage: node scripts/generate-icons.js
 */

import sharp from "sharp"
import { mkdirSync, existsSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT_DIR = join(__dirname, "..")

// Source SVG
const SOURCE_SVG = join(ROOT_DIR, "logo.svg")

// Define all required icon sizes
const ICONS = [
  // Favicon files (public/)
  { size: 16, output: "public/favicon-16x16.png" },
  { size: 32, output: "public/favicon-32x32.png" },
  { size: 32, output: "public/favicon.png" },
  { size: 32, output: "public/favicon.ico" },

  // Apple touch icons (public/)
  // iOS uses the largest available icon for the device's pixel density
  // 180x180 is standard for iPhone, but larger icons improve sharpness on newer devices
  { size: 120, output: "public/apple-touch-icon-120x120.png" },
  { size: 152, output: "public/apple-touch-icon-152x152.png" },
  { size: 167, output: "public/apple-touch-icon-167x167.png" }, // iPad Pro
  { size: 180, output: "public/apple-touch-icon.png" },
  { size: 512, output: "public/apple-touch-icon-512x512.png" }, // High-DPI iOS devices
  { size: 1024, output: "public/apple-touch-icon-1024x1024.png" }, // App Store / max quality

  // PWA icons (public/icons/)
  { size: 96, output: "public/icons/icon-96x96.png" },
  { size: 128, output: "public/icons/icon-128x128.png" },
  { size: 144, output: "public/icons/icon-144x144.png" },
  { size: 152, output: "public/icons/icon-152x152.png" },
  { size: 192, output: "public/icons/icon-192x192.png" },
  { size: 384, output: "public/icons/icon-384x384.png" },
  { size: 512, output: "public/icons/icon-512x512.png" },
  { size: 512, output: "public/icons/icon-maskable-512x512.png" },
]

async function generateIcon(size, outputPath) {
  const relativePath = outputPath.replace(ROOT_DIR + "/", "")

  try {
    // Ensure output directory exists
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

    console.log(`✓ Generated ${relativePath} (${size}x${size})`)
    return true
  } catch (error) {
    console.error(`✗ Failed to generate ${relativePath}: ${error.message}`)
    return false
  }
}

async function main() {
  // Check if source SVG exists
  if (!existsSync(SOURCE_SVG)) {
    console.error(`Error: Source SVG not found at ${SOURCE_SVG}`)
    process.exit(1)
  }

  console.log("Generating icons from logo.svg...\n")

  let successCount = 0
  let failCount = 0

  for (const icon of ICONS) {
    const outputPath = join(ROOT_DIR, icon.output)
    const success = await generateIcon(icon.size, outputPath)

    if (success) {
      successCount++
    } else {
      failCount++
    }
  }

  console.log(`\n${"=".repeat(50)}`)
  console.log(`Generation complete!`)
  console.log(`✓ ${successCount} succeeded`)
  if (failCount > 0) {
    console.log(`✗ ${failCount} failed`)
  }
  console.log(`${"=".repeat(50)}`)

  if (failCount > 0) {
    process.exit(1)
  }
}

main()
