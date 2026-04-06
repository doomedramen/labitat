import sharp from "sharp"
import path from "path"
import fs from "fs"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SVG_PATH = path.join(__dirname, "../labitat_icons/labitat.svg")
const PUBLIC_ICONS = path.join(__dirname, "../public/icons")
const PUBLIC_ROOT = path.join(__dirname, "../public")

const ICON_SIZES = [
  { name: "icon-96x96.png", width: 96, height: 96 },
  { name: "icon-128x128.png", width: 128, height: 128 },
  { name: "icon-144x144.png", width: 144, height: 144 },
  { name: "icon-152x152.png", width: 152, height: 152 },
  { name: "icon-192x192.png", width: 192, height: 192 },
  { name: "icon-384x384.png", width: 384, height: 384 },
  { name: "icon-512x512.png", width: 512, height: 512 },
  { name: "icon-maskable-512x512.png", width: 512, height: 512 },
]

async function generateIcons() {
  console.log("Generating icons from:", SVG_PATH)

  // Ensure directories exist
  if (!fs.existsSync(PUBLIC_ICONS)) {
    fs.mkdirSync(PUBLIC_ICONS, { recursive: true })
  }

  // Generate PWA icons
  for (const size of ICON_SIZES) {
    const outputPath = path.join(PUBLIC_ICONS, size.name)
    console.log(`Generating ${size.name}...`)

    await sharp(SVG_PATH)
      .resize(size.width, size.height, {
        fit: "contain",
        position: "center",
      })
      .png()
      .toFile(outputPath)

    console.log(`✓ ${size.name}`)
  }

  // Generate favicon.ico (32x32 is standard, but let's include multiple sizes)
  const faviconPath = path.join(PUBLIC_ROOT, "favicon.ico")
  console.log("Generating favicon.ico...")

  await sharp(SVG_PATH)
    .resize(32, 32, {
      fit: "contain",
      position: "center",
    })
    .png()
    .toFile(faviconPath.replace(".ico", ".png"))

  // For .ico format, we can use the 32x32 PNG
  // Sharp doesn't natively support .ico multi-size, so we'll use a 32x32 PNG renamed to .ico
  // Or better, let's create a proper multi-size ico using the png file we just created
  await sharp(SVG_PATH)
    .resize(32, 32, {
      fit: "contain",
      position: "center",
    })
    .toFormat("png")
    .toFile(faviconPath)

  console.log("✓ favicon.ico")

  // Generate Apple touch icons
  const appleIcons = [
    { name: "apple-touch-icon.png", width: 180, height: 180 },
    { name: "apple-touch-icon-120x120.png", width: 120, height: 120 },
    { name: "apple-touch-icon-152x152.png", width: 152, height: 152 },
  ]

  for (const icon of appleIcons) {
    const outputPath = path.join(PUBLIC_ROOT, icon.name)
    console.log(`Generating ${icon.name}...`)

    await sharp(SVG_PATH)
      .resize(icon.width, icon.height, {
        fit: "contain",
        position: "center",
      })
      .png()
      .toFile(outputPath)

    console.log(`✓ ${icon.name}`)
  }

  console.log("\nAll icons generated successfully!")
}

generateIcons().catch(console.error)
