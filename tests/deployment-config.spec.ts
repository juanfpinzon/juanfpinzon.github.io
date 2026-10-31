import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

/*
 * Deployment settings that live in files, checked so a change to them is a
 * visible test failure, not a silent drift (Day 29, Block 4).
 *
 * - vercel.json pins the function region to Dublin (`dub1`), next to the
 *   Azure app in North Europe (Ireland). Set in the repository rather than
 *   the dashboard, so it is reviewed and versioned with the code. Vercel
 *   Hobby allows exactly one function region.
 * - The build's function manifest shows each chat route's `maxDuration` as
 *   the platform will read it: 100 s, above the BFF's own 75 s (question) and
 *   90 s (/health) waits, below the 105 s the browser waits, and below
 *   Hobby's 300 s maximum (ADR §8.4).
 *
 * What this cannot prove: that Vercel RAN the function in dub1. That is read
 * from the deployed response's `x-vercel-id` header (Block 5).
 *
 * Run `npm run build` first (the manifest is build output).
 */

test("vercel.json pins the functions to one region: dub1", () => {
  const config = JSON.parse(readFileSync("vercel.json", "utf8")) as { regions?: string[] };
  expect(config.regions).toEqual(["dub1"]);
});

test("both chat routes are functions with maxDuration 100 s in the build output", () => {
  const manifest = JSON.parse(readFileSync(".next/server/functions-config-manifest.json", "utf8")) as {
    functions: Record<string, { maxDuration?: number }>;
  };
  expect(manifest.functions["/api/chat"]?.maxDuration).toBe(100);
  expect(manifest.functions["/api/chat/status"]?.maxDuration).toBe(100);
});
