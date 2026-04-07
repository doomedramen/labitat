import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Test files should not be linted with React rules
    "tests/**",
    // Homepage clone should be ignored
    "homepage/**",
    // VitePress generated files
    "docs/.vitepress/**",
    // Compiled service worker
    "public/sw.js",
    // Coverage reports (generated)
    "coverage/**",
    // Cloned Serwist repo (has its own lint config)
    "serwist/**",
  ]),
]);

export default eslintConfig;
