import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

/*
 * Secret boundary of the BUILT browser assets (no browser needed).
 *
 * Everything under `.next/static/` is downloadable by any visitor: JavaScript
 * chunks, CSS, fonts, media. Day 27 has no server credential at all (no BFF,
 * no upstream call), so these files must contain none of the names that
 * Day 28–29 will introduce, and no value shaped like a key.
 *
 * On failure the test prints the FILE and the NAME/PATTERN that matched, never
 * the matched text, so a real secret could not leak into the test log.
 *
 * Run `npm run build` first; the test fails clearly if the build is missing.
 */

const CLIENT_ASSETS = ".next/static";

/** Environment-variable names that must never reach the browser. */
const FORBIDDEN_NAMES = [
  "PROCURERAG_API_URL",
  "PROCURERAG_SERVICE_TOKEN",
  "OPENROUTER_API_KEY",
  "LANGSMITH_API_KEY",
  "AZURE_CLIENT_SECRET",
  // Any variable with this prefix is inlined into client code by Next.js.
  "NEXT_PUBLIC_",
];

/** Value shapes of common credentials (OpenRouter/OpenAI keys, bearer headers, JWTs). */
const FORBIDDEN_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: "sk- style API key", pattern: /\bsk-[A-Za-z0-9_-]{20,}/ },
  { name: "Bearer header value", pattern: /Bearer\s+[A-Za-z0-9._~+/-]{16,}/ },
  { name: "JWT", pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
];

/** Every file under a directory, recursively. */
function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

test("the production build exists", () => {
  expect(existsSync(CLIENT_ASSETS), "run `npm run build` before `npm test`").toBe(true);
});

test("browser assets contain no secret names or key-shaped values", () => {
  // Only text assets can hold an inlined variable; fonts and images are skipped.
  const textFiles = listFiles(CLIENT_ASSETS).filter((file) => /\.(js|css|map|json|txt|html)$/.test(file));
  expect(textFiles.length).toBeGreaterThan(0);

  const findings: string[] = [];
  for (const file of textFiles) {
    const content = readFileSync(file, "utf8");
    for (const name of FORBIDDEN_NAMES) {
      if (content.includes(name)) findings.push(`${file}: contains the name ${name}`);
    }
    for (const { name, pattern } of FORBIDDEN_PATTERNS) {
      if (pattern.test(content)) findings.push(`${file}: matches a ${name}`);
    }
  }
  expect(findings).toEqual([]);
});

test("no .env file exists in the project", () => {
  // Day 27 needs no environment variables. An .env file would be a sign that
  // a credential crept in, even though .gitignore keeps it out of commits.
  const envFiles = readdirSync(".").filter((entry) => entry.startsWith(".env"));
  expect(envFiles).toEqual([]);
});
