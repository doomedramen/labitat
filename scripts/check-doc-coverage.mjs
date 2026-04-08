/**
 * check-doc-coverage — verifies every adapter has corresponding documentation
 * in the /docs/services directory.
 *
 * Run manually:  pnpm check-doc-coverage
 * Also runs as a pre-push hook.
 *
 * Exit code 1 if any adapters are missing documentation.
 */

import fs from "fs"
import path from "path"

const projectRoot = process.cwd()
const adaptersDir = path.join(projectRoot, "src", "lib", "adapters")
const docsServicesDir = path.join(projectRoot, "docs", "services")

// Files in src/lib/adapters/ that are not service adapters
const NON_ADAPTER_FILES = new Set([
  "index",
  "types",
])

// Widget component files (client-side, imported by adapter definitions, not standalone)
const NON_ADAPTER_SUFFIXES = ["-widget"]

/**
 * Extract adapter IDs from adapter files
 */
function getAdapterIds() {
  const adapterFiles = fs.readdirSync(adaptersDir)
  const ids = []

  for (const file of adapterFiles) {
    const ext = path.extname(file)
    if (ext !== ".ts" && ext !== ".tsx") continue

    const base = path.basename(file, ext)
    if (NON_ADAPTER_FILES.has(base)) continue
    if (NON_ADAPTER_SUFFIXES.some((suffix) => base.endsWith(suffix))) continue

    // Read the file and extract the adapter ID from the definition
    const filePath = path.join(adaptersDir, file)
    const content = fs.readFileSync(filePath, "utf8")

    // Match pattern: id: "adapter-name"
    const idMatch = content.match(/id:\s*["']([^"']+)["']/)
    if (idMatch) {
      ids.push({
        id: idMatch[1],
        file: file,
      })
    }
  }

  return ids
}

/**
 * Get all existing doc files in services subdirectories
 */
function getExistingDocs() {
  const docs = new Set()
  const subdirs = fs.readdirSync(docsServicesDir, { withFileTypes: true })

  for (const entry of subdirs) {
    if (!entry.isDirectory()) continue

    const dirPath = path.join(docsServicesDir, entry.name)
    const files = fs.readdirSync(dirPath)

    for (const file of files) {
      if (file === "index.md") continue
      const base = path.basename(file, ".md")
      docs.add(base)
    }
  }

  return docs
}

/**
 * Main check
 */
function checkDocCoverage() {
  const adapters = getAdapterIds()
  const existingDocs = getExistingDocs()

  const missing = []
  const documented = []

  for (const adapter of adapters) {
    if (existingDocs.has(adapter.id)) {
      documented.push(adapter)
    } else {
      missing.push(adapter)
    }
  }

  // Report results
  if (missing.length > 0) {
    console.error("\n❌ Documentation Coverage Check Failed\n")
    console.error(`Found ${missing.length} adapter(s) without documentation:\n`)

    for (const adapter of missing) {
      console.error(`  ✗ ${adapter.id} (${adapter.file})`)
    }

    console.error(
      `\n📝 To fix: Create documentation files in docs/services/<category>/`,
    )
    console.error(
      `   Example: docs/services/downloads/${missing[0]?.id}.md\n`,
    )
    process.exit(1)
  } else {
    console.log(
      `✓ Documentation coverage: ${documented.length}/${adapters.length} adapters documented (100%)`,
    )
  }
}

// Run the check
checkDocCoverage()
