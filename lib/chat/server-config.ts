/*
 * The chat's server-only settings, read from the environment on EVERY request.
 *
 * Both routes (app/api/chat/route.ts and app/api/chat/status/route.ts) call
 * `readServerSettings`. It is the only place in the app that reads these
 * variables, and it is server-only: the import below makes the build fail if
 * a Client Component ever imports it, so none of this can reach a browser.
 *
 * - No `NEXT_PUBLIC_` prefix: Next.js copies only variables with that prefix
 *   into the browser's JavaScript, at build time. These stay on the server.
 * - Read per request, not once at start-up: the same build then works with
 *   different values in different environments (local, Vercel Production),
 *   and a missing value is caught on the request that needs it.
 * - Missing, blank or unusable: that half of the settings is `null`, the
 *   handler answers `unavailable`, and nothing is called. There is no
 *   fallback credential and no default URL.
 * - The log line names WHICH settings are wrong, never their values.
 *
 * | Variable                          | What it is                                       |
 * |-----------------------------------|--------------------------------------------------|
 * | PROCURERAG_API_URL                | the Azure API's base URL (https)                 |
 * | PROCURERAG_SERVICE_TOKEN          | the Bearer token the API checks                  |
 * | PROCURERAG_CLIENT_HASH_SECRET     | the HMAC key for client digests (32+ chars)      |
 * | UPSTASH_REDIS_REST_URL (or KV_*)  | the quota store's REST URL (https)               |
 * | UPSTASH_REDIS_REST_TOKEN (or KV_*)| the quota store's read/write REST token          |
 * | PROCURERAG_BUDGET_DOMAIN          | the key namespace: one per OpenRouter key        |
 *
 * The Vercel Marketplace's Upstash integration injects the store's two
 * variables. Depending on the integration they are named UPSTASH_REDIS_REST_*
 * or KV_REST_API_*, so both names are accepted (the same rule as Upstash's own
 * `Redis.fromEnv()`), and nobody has to copy a token by hand.
 */

import "server-only";

import { isValidBudgetDomain, storeNamespace, type AdmissionStore } from "./admission";
import type { BffConfig } from "./bff";
import { createUpstashStore } from "./upstash-admission";

/** An HMAC key shorter than this is too easy to guess. `openssl rand -base64 32` gives 44 characters. */
const MIN_CLIENT_HASH_SECRET_CHARS = 32;

export type ServerSettings = {
  /** The API side: URL, token and hash secret. */
  config: BffConfig | null;
  /** The quota store (with the kill switch). */
  store: AdmissionStore | null;
};

/** The first of these variables that has a non-blank value, else "". */
function firstSet(...names: string[]): string {
  for (const name of names) {
    const value = (process.env[name] ?? "").trim();
    if (value) return value;
  }
  return "";
}

/**
 * HTTPS only, except on this machine (`localhost`, `127.0.0.1`) for local
 * runs and tests: a token must never cross a network in plain text.
 */
export function isAllowedServerUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  } catch {
    return false; // not a URL at all
  }
}

export function readServerSettings(route: "/api/chat" | "/api/chat/status"): ServerSettings {
  const apiUrl = firstSet("PROCURERAG_API_URL").replace(/\/+$/, "");
  const serviceToken = firstSet("PROCURERAG_SERVICE_TOKEN");
  const clientHashSecret = firstSet("PROCURERAG_CLIENT_HASH_SECRET");
  const storeUrl = firstSet("UPSTASH_REDIS_REST_URL", "KV_REST_API_URL").replace(/\/+$/, "");
  const storeToken = firstSet("UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_TOKEN");
  const budgetDomain = firstSet("PROCURERAG_BUDGET_DOMAIN");

  const apiProblems: string[] = [];
  if (!apiUrl) apiProblems.push("PROCURERAG_API_URL is not set");
  else if (!isAllowedServerUrl(apiUrl)) apiProblems.push("PROCURERAG_API_URL must be https:// (or http:// on localhost)");
  if (!serviceToken) apiProblems.push("PROCURERAG_SERVICE_TOKEN is not set");
  if (clientHashSecret.length < MIN_CLIENT_HASH_SECRET_CHARS) {
    apiProblems.push(`PROCURERAG_CLIENT_HASH_SECRET must be at least ${MIN_CLIENT_HASH_SECRET_CHARS} characters`);
  }

  const storeProblems: string[] = [];
  if (!storeUrl) storeProblems.push("UPSTASH_REDIS_REST_URL (or KV_REST_API_URL) is not set");
  else if (!isAllowedServerUrl(storeUrl)) storeProblems.push("the store URL must be https:// (or http:// on localhost)");
  if (!storeToken) storeProblems.push("UPSTASH_REDIS_REST_TOKEN (or KV_REST_API_TOKEN) is not set");
  if (!isValidBudgetDomain(budgetDomain)) {
    storeProblems.push("PROCURERAG_BUDGET_DOMAIN must be 1-40 characters of a-z, 0-9 and '-'");
  }

  const problems = [...apiProblems, ...storeProblems];
  if (problems.length > 0) {
    console.error(JSON.stringify({ route, event: "config_unusable", problems }));
  }

  return {
    config: apiProblems.length === 0 ? { apiUrl, serviceToken, clientHashSecret } : null,
    store:
      storeProblems.length === 0
        ? createUpstashStore({ url: storeUrl, token: storeToken, namespace: storeNamespace(budgetDomain) })
        : null,
  };
}
