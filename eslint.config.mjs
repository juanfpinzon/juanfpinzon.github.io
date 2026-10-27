import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  // Next.js rules (including the React and accessibility checks that
  // `core-web-vitals` turns into errors) plus the TypeScript rules.
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // Default ignores of eslint-config-next (build output, generated types).
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Playwright output folders.
    "test-results/**",
    "playwright-report/**",
    // The legacy Jekyll site still lives in this repository until the Day 30
    // cutover. Its theme JavaScript is not part of the Next.js app.
    "assets/**",
    "_site/**",
  ]),
]);

export default eslintConfig;
