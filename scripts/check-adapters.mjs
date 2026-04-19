import { registry } from "../src/lib/adapters/index";
import fs from "fs";
import path from "path";

/**
 * check-adapters — Performs deep validation of the service adapter registry.
 *
 * Checks performed:
 * 1. File registration: Every .tsx file in adapters/ must be in the registry.
 * 2. Schema validation: Every adapter must have id, name, icon, and category.
 * 3. Configuration: Config field keys must be unique within an adapter.
 * 4. Implementation: Must have either fetchData or clientSide: true.
 */

const adaptersDir = path.join(process.cwd(), "src", "lib", "adapters");
const NON_ADAPTER_FILES = new Set([
  "index",
  "types",
  "widget-types",
  "validate",
  "fetch-with-timeout",
  "mock-utilities",
]);
const NON_ADAPTER_SUFFIXES = [".test", "-widget", "-common", ".stories"];

async function main() {
  console.log("🔍 Deep-checking service adapters...");
  let errors = 0;

  // 1. Check for unregistered files
  const files = fs.readdirSync(adaptersDir);

  for (const file of files) {
    const ext = path.extname(file);
    if (ext !== ".ts" && ext !== ".tsx") continue;

    const base = path.basename(file, ext);
    if (NON_ADAPTER_FILES.has(base)) continue;
    if (NON_ADAPTER_SUFFIXES.some((s) => base.endsWith(s))) continue;

    const adapter = Object.values(registry).find((a) => {
      // This is a bit loose but works for our naming convention
      return a.id === base || a.id.replace(/-/g, "") === base.toLowerCase();
    });

    if (!adapter) {
      console.error(
        `❌ File "src/lib/adapters/${file}" exists but no corresponding adapter is in the registry.`,
      );
      errors++;
    }
  }

  // 2. Validate registry contents
  for (const [id, adapter] of Object.entries(registry)) {
    const prefix = `[${id}]`;

    if (!adapter.name) {
      console.error(`${prefix} Missing display name.`);
      errors++;
    }

    if (!adapter.icon) {
      console.error(`${prefix} Missing icon definition.`);
      errors++;
    }

    if (!adapter.category) {
      console.error(`${prefix} Missing category.`);
      errors++;
    }

    // Check for duplicate config keys
    if (adapter.configFields) {
      const keys = new Set();
      for (const field of adapter.configFields) {
        if (keys.has(field.key)) {
          console.error(`${prefix} Duplicate config field key: "${field.key}"`);
          errors++;
        }
        keys.add(field.key);
      }
    }

    // Implementation check
    if (!adapter.fetchData && !adapter.clientSide) {
      console.error(`${prefix} Must provide "fetchData" or set "clientSide: true".`);
      errors++;
    }
  }

  if (errors > 0) {
    console.error(`\n❌ Validation failed with ${errors} error(s).`);
    process.exit(1);
  }

  console.log(`✅ ${Object.keys(registry).length} adapters validated successfully.`);
}

main().catch((err) => {
  console.error("Fatal error during validation:", err);
  process.exit(1);
});
