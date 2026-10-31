/**
 * Shared test data: the three preview routes, the viewport widths the Day 27
 * route asks for, and the forbidden-claims list. The list lives here (not in
 * a spec file) because both the page-text test and the metadata test use it,
 * and importing one spec file into another would register its tests twice.
 *
 * 320 px is also the WCAG 1.4.10 reflow condition: a 1280 px window at 400%
 * zoom is 320 CSS px wide, so "no sideways scroll at 320 px" is the automated
 * stand-in for the 400% zoom check. (Real browser zoom is still checked by
 * hand, see the learning log.)
 */
export const ROUTES = ["/", "/procurerag", "/about"] as const;

/**
 * The chat BFF's server-only settings, as the test server gets them
 * (playwright.config.ts → webServer.env). They are runtime settings: the
 * production build itself never sees them.
 *
 * - The upstream URL points at port 1 on this machine. Port 1 is on the Fetch
 *   standard's list of blocked ports, so Node's `fetch` refuses it ITSELF
 *   ("bad port") before any packet is sent. Every question that passes the
 *   BFF's checks therefore fails at the network step and must answer
 *   `unavailable` (fail closed), with no ProcureRAG service needed, and it
 *   is guaranteed never to reach a real server on this machine.
 * - The quota store is tests/fake-upstash-server.mjs on its own port: kill
 *   switch on, every admission "admitted". The real Lua is tested elsewhere.
 * - Tokens and secrets are obvious placeholders, not credentials. Tests search
 *   the HTML, JavaScript and API responses for them, to prove a server-only
 *   value never reaches the browser.
 */
export const TEST_UPSTREAM_URL = "http://127.0.0.1:1";
export const PLACEHOLDER_SERVICE_TOKEN = "playwright-placeholder-service-token-not-a-secret";
export const FAKE_STORE_PORT = 3101;
export const FAKE_STORE_URL = `http://127.0.0.1:${FAKE_STORE_PORT}`;
export const PLACEHOLDER_STORE_TOKEN = "playwright-placeholder-store-token-not-a-secret";
export const PLACEHOLDER_CLIENT_HASH_SECRET = "playwright-placeholder-client-hash-secret-not-a-secret";

/**
 * The address the route tests put in `x-vercel-forwarded-for` (RFC 5737
 * documentation range, never a real client). Locally this header is just
 * text that the test typed: it lets a request reach the admission step, and
 * proves only the wiring. That Vercel overwrites a forged value is checked on
 * the deployed chain (ProcureRAG `scripts/deployed_proof.py spoof-check`).
 */
export const TEST_CLIENT_ADDRESS = "203.0.113.7";

export const VIEWPORT_WIDTHS = [320, 375, 768, 1024, 1280, 1440] as const;

/**
 * Phrases that must never appear on any route. Each one is a real risk from
 * the inventory: an employer title Juan never held, a credential not yet
 * earned, the old site's wrong numbers, or a claim that something is live.
 */
export const FORBIDDEN: { pattern: RegExp; why: string }[] = [
  { pattern: /senior ai engineer/i, why: "a target role, never a held title" },
  { pattern: /azure ai engineer/i, why: "credential still in progress (CV only)" },
  { pattern: /SEPLN 2021/i, why: "the NER paper is 2020" },
  { pattern: /\b500 (CVs|annotated|resumes)/i, why: "the dataset README says 545" },
  { pattern: /\b7 years\b/i, why: "the August CV's over-claim" },
  { pattern: /try (the )?(live )?demo/i, why: "no demo exists yet" },
  { pattern: /live demo:(?! in progress)/i, why: "the demo status must stay 'in progress'" },
  { pattern: /(?<!not )answer accuracy/i, why: "P@1 is retrieval ranking, not answer accuracy" },
  { pattern: /(?<!not a )deployed clinical/i, why: "the U-NET work was a proof of concept" },
  { pattern: /production[- ]ready|enterprise[- ](ready|grade)/i, why: "ProcureRAG is a learning project" },
  { pattern: /endorsed by|in partnership with/i, why: "no employer endorsement" },
  { pattern: /currently deployed|live on azure|running on azure/i, why: "the Azure resources were deleted" },
];
