#!/usr/bin/env node

/**
 * Generate PWA icons from a source SVG
 * Run: node scripts/generate-icons.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const publicDir = path.join(rootDir, 'public', 'icons')

// Simple Labitat logo as SVG (stylized "L")
const logoSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="80" fill="url(#grad)"/>
  <path d="M140 100h80v240h150v80H140V100z" fill="white"/>
</svg>
`.trim()

async function generateIcons() {
  // Ensure output directory exists
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }

  // Create buffer from SVG
  const svgBuffer = Buffer.from(logoSvg)

  // Generate icon sizes
  const sizes = [192, 512]

  for (const size of sizes) {
    const outputPath = path.join(publicDir, `icon-${size}x${size}.png`)
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath)
    console.log(`Generated: icon-${size}x${size}.png`)
  }

  // Generate maskable icon (with more padding)
  const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#grad)"/>
  <rect x="64" y="64" width="384" height="384" rx="60" fill="white" fill-opacity="0.1"/>
  <path d="M160 140h60v200h120v60H160V140z" fill="white"/>
</svg>
`.trim()

  const maskableBuffer = Buffer.from(maskableSvg)
  const maskablePath = path.join(publicDir, 'icon-maskable-512x512.png')
  await sharp(maskableBuffer)
    .resize(512, 512)
    .png()
    .toFile(maskablePath)
  console.log('Generated: icon-maskable-512x512.png')

  console.log('\nAll icons generated successfully!')
}

generateIcons().catch(console.error)
