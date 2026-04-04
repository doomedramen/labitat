#!/usr/bin/env node
/**
 * Scaffold a new service adapter for Labitat.
 * Usage: pnpm new-service
 *
 * Prompts for service name, category, and polling interval,
 * then creates the adapter file and updates the registry.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const adaptersDir = path.join(rootDir, "lib", "adapters");
const registryFile = path.join(adaptersDir, "index.ts");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function toKebabCase(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function toPascalCase(str) {
  return str
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\s/g, "");
}

function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

const CATEGORIES = [
  "media",
  "downloads",
  "networking",
  "monitoring",
  "info",
  "storage",
  "automation",
  "security",
  "productivity",
  "finance",
];

async function main() {
  console.log("🔧 Labitat Service Scaffold\n");

  const name = await ask("Service name (e.g. My Service): ");
  if (!name) {
    console.log("Aborted.");
    rl.close();
    return;
  }

  const id = toKebabCase(name);
  const pascalName = toPascalCase(id);
  const camelName = toCamelCase(id);

  console.log(`\nCategories: ${CATEGORIES.join(", ")}`);
  let category = await ask("Category [monitoring]: ");
  if (!category) category = "monitoring";
  if (!CATEGORIES.includes(category)) {
    console.log(`Warning: "${category}" is not a standard category.`);
  }

  const polling = await ask("Polling interval in ms [10000]: ");
  const pollingMs = parseInt(polling, 10) || 10_000;

  const adapterFile = path.join(adaptersDir, `${id}.tsx`);

  if (fs.existsSync(adapterFile)) {
    console.log(`\n❌ Adapter already exists: ${id}.tsx`);
    rl.close();
    return;
  }

  const template = `import type { ServiceDefinition } from "./types"

type ${pascalName}Data = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  // Add your data fields below
  example: number
}

function ${pascalName}Widget({ example }: ${pascalName}Data) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(60px,1fr))] gap-1.5 text-xs">
      <div className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-1 text-center">
        <span className="tabular-nums font-medium text-foreground">{example}</span>
        <span className="text-muted-foreground">Example</span>
      </div>
    </div>
  )
}

export const ${camelName}Definition: ServiceDefinition<${pascalName}Data> = {
  id: "${id}",
  name: "${name}",
  icon: "${id}",
  category: "${category}",
  defaultPollingMs: ${pollingMs},

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "http://10.0.0.1",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: false,
    },
  ],

  async fetchData(config) {
    const res = await fetch(\`\${config.url}/api/endpoint\`, {
      headers: config.apiKey ? { "X-Api-Key": config.apiKey } : {},
    })

    if (!res.ok) {
      if (res.status === 401) throw new Error("Invalid API key")
      if (res.status === 404) throw new Error("Service not found")
      throw new Error(\`Service error: \${res.status}\`)
    }

    const data = await res.json()

    return {
      _status: "ok" as const,
      example: data.value ?? 0,
    }
  },

  Widget: ${pascalName}Widget,
}
`;

  fs.writeFileSync(adapterFile, template, "utf-8");
  console.log(`\n✅ Created: lib/adapters/${id}.tsx`);

  // Update registry
  const registryContent = fs.readFileSync(registryFile, "utf-8");

  const importLine = `import { ${camelName}Definition } from "./${id}"`;

  // Find the "// ── Disabled widgets" section or the end of imports
  const disabledSection = registryContent.indexOf("// ── Disabled widgets");
  if (disabledSection !== -1) {
    // Insert before the disabled section
    const before = registryContent.slice(0, disabledSection);
    const after = registryContent.slice(disabledSection);
    const newRegistry = before + importLine + "\n" + after;
    fs.writeFileSync(registryFile, newRegistry, "utf-8");
  } else {
    // Just add after existing imports
    const lastImport = registryContent.lastIndexOf("from \"./");
    const endOfLastImport = registryContent.indexOf("\n", lastImport);
    const before = registryContent.slice(0, endOfLastImport + 1);
    const after = registryContent.slice(endOfLastImport + 1);
    const newRegistry = before + importLine + "\n" + after;
    fs.writeFileSync(registryFile, newRegistry, "utf-8");
  }

  // Add to registry object
  const registryObjMatch = registryContent.match(
    /export const registry: ServiceRegistry = \{([\s\S]*?)\n\}/
  );
  if (registryObjMatch) {
    const registryObj = registryObjMatch[1];
    const newEntry = `\n  [${camelName}Definition.id]: ${camelName}Definition,`;

    // Find the "// Disabled widgets" comment in registry object
    const disabledInObj = registryObj.indexOf("// Disabled widgets");
    let updatedRegistryObj;
    if (disabledInObj !== -1) {
      updatedRegistryObj =
        registryObj.slice(0, disabledInObj) +
        newEntry +
        "\n" +
        registryObj.slice(disabledInObj);
    } else {
      updatedRegistryObj = registryObj + newEntry;
    }

    const newRegistryContent = registryContent.replace(
      /export const registry: ServiceRegistry = \{[\s\S]*?\n\}/,
      `export const registry: ServiceRegistry = {${updatedRegistryObj}\n}`
    );
    fs.writeFileSync(registryFile, newRegistryContent, "utf-8");
    console.log(`✅ Registered in lib/adapters/index.ts`);
  }

  console.log(`\n📝 Next steps:`);
  console.log(`   1. Edit lib/adapters/${id}.tsx with your API logic`);
  console.log(`   2. Run pnpm check-adapters to verify`);
  console.log(`   3. Add docs/services/${id}.md`);

  rl.close();
}

main().catch((err) => {
  console.error("Error:", err.message);
  rl.close();
  process.exit(1);
});
