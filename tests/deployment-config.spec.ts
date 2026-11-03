import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { LEASE_TTL_MS } from "@/lib/chat/admission";
import { UPSTREAM_TIMEOUT_MS } from "@/lib/chat/bff";
import { HEALTH_TIMEOUT_MS } from "@/lib/chat/status";

/*
 * Deployment settings that live in files, checked so a change to them is a
 * visible test failure, not a silent drift (Day 29, Block 4).
 *
 * - vercel.json pins the function region to Dublin (`dub1`), next to the
 *   Azure app in North Europe (Ireland). Set in the repository rather than
 *   the dashboard, so it is reviewed and versioned with the code. Vercel
 *   Hobby allows exactly one function region.
 * - The build's function manifest shows each chat route's `maxDuration` as
 *   the platform will read it: 100 s, above the BFF's own 90 s waits (question
 *   and /health), below the 105 s the browser waits, and below Hobby's 300 s
 *   maximum (ADR §8.4).
 * - The timeouts and the lease are derived from each other (ADR §8.3.1,
 *   §8.4), so the arithmetic is checked here too.
 *
 * What this cannot prove: that Vercel RAN the function in dub1. That is read
 * from the deployed response's `x-vercel-id` header (Block 5).
 *
 * Run `npm run build` first (the manifest is build output).
 */

/** Both chat routes' `maxDuration`, in ms (app/api/chat/route.ts, app/api/chat/status/route.ts). */
const MAX_DURATION_MS = 100_000;
/** Time a route may spend outside its upstream wait: up to three store calls of at most 3 s each. */
const STORE_CALLS_MS = 3 * 3_000;
/** The slowest cold path measured on Day 29: the status check that was ready after 84.0 s (runbook §5.4). */
const SLOWEST_MEASURED_COLD_PATH_MS = 84_000;
/** The API's one provider call: 60 s timeout, SDK retries off (ProcureRAG src/generation.py). */
const PROVIDER_TIMEOUT_MS = 60_000;
/** Retrieval: 3-4 s measured on the 1-vCPU replica; 10 s allows for two questions at once. */
const RETRIEVAL_ALLOWANCE_MS = 10_000;

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

test("the question timeout covers a cold start and still answers inside maxDuration", () => {
  // A visitor may ask while the warm-up check is still waking the replica, so
  // the question can wait for a whole cold start (the Day 29 review).
  expect(UPSTREAM_TIMEOUT_MS).toBeGreaterThan(SLOWEST_MEASURED_COLD_PATH_MS);
  // The typed `timed_out` must arrive before the platform cuts the function off.
  for (const wait of [UPSTREAM_TIMEOUT_MS, HEALTH_TIMEOUT_MS]) {
    expect(wait + STORE_CALLS_MS).toBeLessThan(MAX_DURATION_MS);
  }
});

test("the lease outlives the worst continuation of an admitted question, with the 20% margin", () => {
  // After a BFF timeout, Azure may still be working: the request can reach it
  // as late as the timeout, then retrieve, then make its one provider call.
  const worstContinuation = UPSTREAM_TIMEOUT_MS + RETRIEVAL_ALLOWANCE_MS + PROVIDER_TIMEOUT_MS;
  expect(LEASE_TTL_MS).toBeGreaterThanOrEqual(1.2 * worstContinuation);
});
