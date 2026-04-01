#!/usr/bin/env node
/**
 * Build service worker from TypeScript
 * Reads version from package.json and bundles the SW
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { build } from 'esbuild'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

// Read version from package.json
const packageJson = JSON.parse(
  readFileSync(join(rootDir, 'package.json'), 'utf-8')
)
const version = packageJson.version

console.log(`Building service worker with version: ${version}`)

// Build service worker with esbuild
await build({
  entryPoints: [join(rootDir, 'public', 'sw.ts')],
  outfile: join(rootDir, 'public', 'sw.js'),
  bundle: true,
  minify: true,
  target: ['es2020'],
  format: 'iife',
  define: {
    'SW_VERSION': JSON.stringify(version),
  },
  platform: 'browser',
  sourcemap: false,
})

console.log('✓ Service worker built successfully')
