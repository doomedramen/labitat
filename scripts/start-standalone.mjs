import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

async function exists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const rootDir = process.cwd();
  const standaloneDir = path.join(rootDir, ".next", "standalone");
  const serverPath = path.join(standaloneDir, "server.js");

  if (!(await exists(serverPath))) {
    // Fall back to Next's built-in start if standalone output isn't present.
    const child = spawn("next", ["start"], { stdio: "inherit", shell: true });
    child.on("exit", (code) => process.exit(code ?? 1));
    return;
  }

  // Standalone output requires static assets to be present alongside the server.
  const srcStatic = path.join(rootDir, ".next", "static");
  const destStatic = path.join(standaloneDir, ".next", "static");
  const srcPublic = path.join(rootDir, "public");
  const destPublic = path.join(standaloneDir, "public");

  if (await exists(srcStatic)) {
    await fs.rm(destStatic, { recursive: true, force: true });
    await fs.mkdir(path.dirname(destStatic), { recursive: true });
    await fs.cp(srcStatic, destStatic, { recursive: true });
  }

  if (await exists(srcPublic)) {
    await fs.rm(destPublic, { recursive: true, force: true });
    await fs.cp(srcPublic, destPublic, { recursive: true });
  }

  const child = spawn(process.execPath, [serverPath], { stdio: "inherit" });
  child.on("exit", (code) => process.exit(code ?? 1));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

