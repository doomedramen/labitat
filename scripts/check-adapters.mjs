/**
 * check-adapters — verifies every adapter file in lib/adapters/ is registered
 * in lib/adapters/index.ts.
 *
 * Run manually:  pnpm check-adapters
 * Also runs in CI and as a pre-commit hook.
 *
 * Exit code 1 if any unregistered adapters are found.
 */

import fs from "fs"
import path from "path"

// process.cwd() is always the project root when invoked via a pnpm script
const adaptersDir = path.join(process.cwd(), "src", "lib", "adapters")
const indexPath = path.join(adaptersDir, "index.ts")

// Files in lib/adapters/ that are not service adapters
const NON_ADAPTER_FILES = new Set(["index", "types", "widget-types", "widgets", "glances-common", "viz"])
// Widget component files (client-side, imported by adapter definitions, not standalone)
const NON_ADAPTER_SUFFIXES = new Set(["-widget"])

const indexSource = fs.readFileSync(indexPath, "utf8")
const adapterFiles = fs.readdirSync(adaptersDir)

let missing = 0

for (const file of adapterFiles) {
  const ext = path.extname(file)
  if (ext !== ".ts" && ext !== ".tsx") continue

  // Skip test files
  if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue

  const base = path.basename(file, ext)
  if (NON_ADAPTER_FILES.has(base)) continue

  // Skip widget component files (e.g. glances-timeseries-widget.tsx)
  if ([...NON_ADAPTER_SUFFIXES].some((suffix) => base.endsWith(suffix))) continue

  // Match `./${base}` regardless of surrounding quote style
  if (!indexSource.includes(`./${base}`)) {
    console.error(`✗ "${file}" is not imported in src/lib/adapters/index.ts`)
    missing++
  }
}

if (missing > 0) {
  console.error(
    `\nFound ${missing} unregistered adapter file(s). ` +
      "Add them to src/lib/adapters/index.ts or run `pnpm new-service` to scaffold correctly.",
  )
  process.exit(1)
} else {
  const adapterCount = adapterFiles.filter((f) => {
    const ext = path.extname(f)
    return (
      (ext === ".ts" || ext === ".tsx") &&
      !NON_ADAPTER_FILES.has(path.basename(f, ext))
    )
  }).length
  console.log(`✓ All ${adapterCount} adapters are registered.`)
}
