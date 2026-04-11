#!/usr/bin/env node

/**
 * Icon & Splash Screen Generator
 * Generates all required icon sizes from logo.svg
 * Generates iOS splash screens from logo_transparent.svg with gradient background
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

const SOURCE_SVG = join(ROOT_DIR, "logo.svg")
const SOURCE_SVG_TRANSPARENT = join(ROOT_DIR, "logo_transparent.svg")

// Gradient: top-left (#0a84ff) → bottom-right (#5e5ce6)
const GRADIENT_START = { r: 0x0a, g: 0x84, b: 0xff }
const GRADIENT_END = { r: 0x5e, g: 0x5c, b: 0xe6 }

// Define all required icon sizes
const ICONS = [
  // ── App (public/) ─────────────────────────────────────────────────────────
  { size: 16, output: "public/favicon-16x16.png" },
  { size: 32, output: "public/favicon-32x32.png" },
  { size: 32, output: "public/favicon.png" },
  { size: 32, output: "public/favicon.ico" },

  // Apple touch icons
  { size: 120, output: "public/apple-touch-icon-120x120.png" },
  { size: 152, output: "public/apple-touch-icon-152x152.png" },
  { size: 167, output: "public/apple-touch-icon-167x167.png" },
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

// iOS splash screens: actual pixel dimensions (CSS points × device pixel ratio)
// Logo is rendered at ~25% of the shorter dimension, centered.
const SPLASH_SCREENS = [
  // iPhones
  {
    w: 1125,
    h: 2436,
    name: "iPhone_13_mini__iPhone_12_mini__iPhone_11_Pro__iPhone_XS__iPhone_X_portrait",
  },
  {
    w: 2436,
    h: 1125,
    name: "iPhone_13_mini__iPhone_12_mini__iPhone_11_Pro__iPhone_XS__iPhone_X_landscape",
  },
  { w: 828, h: 1792, name: "iPhone_11__iPhone_XR_portrait" },
  { w: 1792, h: 828, name: "iPhone_11__iPhone_XR_landscape" },
  { w: 1242, h: 2688, name: "iPhone_11_Pro_Max__iPhone_XS_Max_portrait" },
  { w: 2688, h: 1242, name: "iPhone_11_Pro_Max__iPhone_XS_Max_landscape" },
  {
    w: 1170,
    h: 2532,
    name: "iPhone_17e__iPhone_16e__iPhone_14__iPhone_13_Pro__iPhone_13__iPhone_12_Pro__iPhone_12_portrait",
  },
  {
    w: 2532,
    h: 1170,
    name: "iPhone_17e__iPhone_16e__iPhone_14__iPhone_13_Pro__iPhone_13__iPhone_12_Pro__iPhone_12_landscape",
  },
  {
    w: 1284,
    h: 2778,
    name: "iPhone_14_Plus__iPhone_13_Pro_Max__iPhone_12_Pro_Max_portrait",
  },
  {
    w: 2778,
    h: 1284,
    name: "iPhone_14_Plus__iPhone_13_Pro_Max__iPhone_12_Pro_Max_landscape",
  },
  {
    w: 1179,
    h: 2556,
    name: "iPhone_16__iPhone_15_Pro__iPhone_15__iPhone_14_Pro_portrait",
  },
  {
    w: 2556,
    h: 1179,
    name: "iPhone_16__iPhone_15_Pro__iPhone_15__iPhone_14_Pro_landscape",
  },
  {
    w: 1290,
    h: 2796,
    name: "iPhone_16_Plus__iPhone_15_Pro_Max__iPhone_15_Plus__iPhone_14_Pro_Max_portrait",
  },
  {
    w: 2796,
    h: 1290,
    name: "iPhone_16_Plus__iPhone_15_Pro_Max__iPhone_15_Plus__iPhone_14_Pro_Max_landscape",
  },
  {
    w: 1206,
    h: 2622,
    name: "iPhone_17_Pro__iPhone_17__iPhone_16_Pro_portrait",
  },
  {
    w: 2622,
    h: 1206,
    name: "iPhone_17_Pro__iPhone_17__iPhone_16_Pro_landscape",
  },
  { w: 1320, h: 2868, name: "iPhone_17_Pro_Max__iPhone_16_Pro_Max_portrait" },
  { w: 2868, h: 1320, name: "iPhone_17_Pro_Max__iPhone_16_Pro_Max_landscape" },
  { w: 1260, h: 2736, name: "iPhone_Air_portrait" },
  { w: 2736, h: 1260, name: "iPhone_Air_landscape" },
  // iPads
  {
    w: 1536,
    h: 2048,
    name: "9.7__iPad_Pro__7.9__iPad_mini__9.7__iPad_Air__9.7__iPad_portrait",
  },
  {
    w: 2048,
    h: 1536,
    name: "9.7__iPad_Pro__7.9__iPad_mini__9.7__iPad_Air__9.7__iPad_landscape",
  },
  { w: 1620, h: 2160, name: "10.2__iPad_portrait" },
  { w: 2160, h: 1620, name: "10.2__iPad_landscape" },
  { w: 1668, h: 2224, name: "10.5__iPad_Air_portrait" },
  { w: 2224, h: 1668, name: "10.5__iPad_Air_landscape" },
  { w: 1640, h: 2360, name: "10.9__iPad_Air_portrait" },
  { w: 2360, h: 1640, name: "10.9__iPad_Air_landscape" },
  { w: 1668, h: 2388, name: "11__iPad_Pro__10.5__iPad_Pro_portrait" },
  { w: 2388, h: 1668, name: "11__iPad_Pro__10.5__iPad_Pro_landscape" },
  { w: 1668, h: 2420, name: "11__iPad_Pro_M4_portrait" },
  { w: 2420, h: 1668, name: "11__iPad_Pro_M4_landscape" },
  { w: 1488, h: 2266, name: "8.3__iPad_Mini_portrait" },
  { w: 2266, h: 1488, name: "8.3__iPad_Mini_landscape" },
  { w: 2048, h: 2732, name: "12.9__iPad_Pro_portrait" },
  { w: 2732, h: 2048, name: "12.9__iPad_Pro_landscape" },
  { w: 2064, h: 2752, name: "13__iPad_Pro_M4_portrait" },
  { w: 2752, h: 2064, name: "13__iPad_Pro_M4_landscape" },
]

function gradientSvg(w, h) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#0a84ff"/>
          <stop offset="1" stop-color="#5e5ce6"/>
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#g)"/>
    </svg>`
  )
}

async function generateSplash(w, h, name) {
  const outputPath = join(ROOT_DIR, "public/splash_screens", `${name}.png`)
  const relativePath = outputPath.replace(ROOT_DIR + "/", "")

  // Logo size: 30% of the shorter dimension
  const logoSize = Math.round(Math.min(w, h) * 0.3)

  const logoPng = await sharp(SOURCE_SVG_TRANSPARENT)
    .resize(logoSize, logoSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()

  const left = Math.round((w - logoSize) / 2)
  const top = Math.round((h - logoSize) / 2)

  await sharp(gradientSvg(w, h))
    .composite([{ input: logoPng, left, top }])
    .png()
    .toFile(outputPath)

  console.log(`✓ ${relativePath} (${w}x${h})`)
}

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
  if (!existsSync(SOURCE_SVG_TRANSPARENT)) {
    console.error(
      `Error: Transparent logo SVG not found at ${SOURCE_SVG_TRANSPARENT}`
    )
    process.exit(1)
  }

  console.log("Generating icons from logo.svg...\n")

  copyFileSync(SOURCE_SVG, join(ROOT_DIR, "docs/public/logo.svg"))
  console.log("✓ docs/public/logo.svg")

  for (const icon of ICONS) {
    await generateIcon(icon.size, join(ROOT_DIR, icon.output))
  }

  console.log("\nGenerating splash screens from logo_transparent.svg...\n")

  mkdirSync(join(ROOT_DIR, "public/splash_screens"), { recursive: true })

  for (const splash of SPLASH_SCREENS) {
    await generateSplash(splash.w, splash.h, splash.name)
  }

  console.log("\nDone!")
}

main()
