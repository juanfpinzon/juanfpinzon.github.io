import http from "node:http";
import { expect, test } from "@playwright/test";
import {
  FAKE_STORE_URL,
  PLACEHOLDER_CLIENT_HASH_SECRET,
  PLACEHOLDER_SERVICE_TOKEN,
  PLACEHOLDER_STORE_TOKEN,
  TEST_CLIENT_ADDRESS,
  TEST_UPSTREAM_URL,
} from "./routes";

/*
 * The REAL route (app/api/chat/route.ts), built by `npm run build`, served by
 * `next start`, and called over HTTP.
 *
 * tests/chat-bff.spec.ts tests the BFF's logic with a fake upstream. This file
 * proves the built route is wired to that logic: the server-only settings are
 * read at request time, the byte cap holds on a real socket, a failed
 * upstream call fails closed, and nothing a browser receives holds a
 * server-only value.
 *
 * The test server's upstream is port 1, which `fetch` refuses itself as a
 * blocked port (tests/routes.ts), so no ProcureRAG service is needed. Its
 * quota store is tests/fake-upstash-server.mjs: kill switch on, everything
 * admitted. Every question that passes the BFF's checks therefore ends as 503
 * `unavailable`, which is how these tests can tell "refused by the BFF"
 * (413/422) from "admitted and sent upstream".
 *
 * `x-vercel-forwarded-for` is sent by the tests themselves where a request
 * must reach admission. Locally that header is just text the test typed: it
 * proves the wiring, not that the address can be trusted (tests/routes.ts).
 */

const GRNI = "What does GRNI mean?";
/** What Vercel's proxy would add on a deployment; here the test adds it. */
const PLATFORM_HEADERS = { "x-vercel-forwarded-for": TEST_CLIENT_ADDRESS };

test("only POST exists: a GET is 405", async ({ request }) => {
  expect((await request.get("/api/chat")).status()).toBe(405);
});

test("a valid question passes every check and admission, then the failed upstream call is 503 unavailable", async ({
  request,
}) => {
  const response = await request.post("/api/chat", { headers: PLATFORM_HEADERS, data: { question: GRNI } });

  expect(response.status()).toBe(503);
  expect((await response.json()).state).toBe("unavailable");
  expect(response.headers()["cache-control"]).toBe("no-store");
});

test("escalation fields, broken JSON and non-JSON bodies are refused (422) before any upstream call", async ({
  request,
}) => {
  const json = { "Content-Type": "application/json" };
  const refused = [
    await request.post("/api/chat", { data: { question: GRNI, role: "buyer" } }),
    await request.post("/api/chat", { data: { question: GRNI, decision: { type: "approve" } } }),
    await request.post("/api/chat", { headers: json, data: '{"question": "What does GRNI' }),
    await request.post("/api/chat", { headers: { "Content-Type": "text/plain" }, data: `{"question": "${GRNI}"}` }),
  ];

  for (const response of refused) {
    // 422, not 503: the BFF refused them itself, so nothing was sent upstream.
    expect(response.status()).toBe(422);
    expect((await response.json()).state).toBe("invalid_question");
  }
});

test("a body over 2 KB is 413 when its Content-Length says so", async ({ request }) => {
  const padded = `{"question": "${GRNI}"${" ".repeat(3000)}}`;
  const response = await request.post("/api/chat", { headers: { "Content-Type": "application/json" }, data: padded });

  expect(response.status()).toBe(413);
  expect((await response.json()).state).toBe("invalid_question");
});

test("a body over 2 KB is 413 even when it is chunked and has no Content-Length", async ({ baseURL }) => {
  // Node's own HTTP client, because it can stream a body in chunks without a
  // length, the way `Transfer-Encoding: chunked` requests arrive.
  const status = await new Promise<number>((resolve, reject) => {
    const request = http.request(
      new URL("/api/chat", baseURL),
      { method: "POST", headers: { "Content-Type": "application/json", "Transfer-Encoding": "chunked" } },
      (response) => {
        response.resume();
        resolve(response.statusCode ?? 0);
      },
    );
    request.on("error", reject);
    request.write(`{"question": "${GRNI}"`);
    for (let chunk = 0; chunk < 30; chunk++) request.write(" ".repeat(100)); // 3,000 more bytes
    request.end("}");
  });

  expect(status).toBe(413);
});

test("nothing a browser receives contains a server-only setting", async ({ request }) => {
  // Everything a visitor's browser downloads for the case study: the HTML
  // (including Next.js's inline data scripts), every script it loads, and a
  // chat answer.
  const html = await (await request.get("/procurerag")).text();
  const scriptUrls = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => match[1]);
  expect(scriptUrls.length).toBeGreaterThan(0);
  const scripts = await Promise.all(scriptUrls.map(async (url) => (await request.get(url)).text()));
  const answer = await (await request.post("/api/chat", { headers: PLATFORM_HEADERS, data: { question: GRNI } })).text();
  const status = await (await request.get("/api/chat/status", { headers: PLATFORM_HEADERS })).text();

  // The upstream URL as a pattern: "127.0.0.1:1" must not match a longer port such as ":3100".
  const upstreamUrl = new RegExp(`${TEST_UPSTREAM_URL.replaceAll(".", "\\.")}(?!\\d)`);
  for (const body of [html, ...scripts, answer, status]) {
    for (const secret of [PLACEHOLDER_SERVICE_TOKEN, PLACEHOLDER_STORE_TOKEN, PLACEHOLDER_CLIENT_HASH_SECRET, FAKE_STORE_URL]) {
      expect(body).not.toContain(secret);
    }
    // Exact names: the case study itself legitimately mentions PROCURERAG_LIVE_LLM.
    for (const name of [
      "PROCURERAG_SERVICE_TOKEN",
      "PROCURERAG_API_URL",
      "PROCURERAG_CLIENT_HASH_SECRET",
      "PROCURERAG_BUDGET_DOMAIN",
      "UPSTASH_REDIS_REST",
      "KV_REST_API",
    ]) {
      expect(body).not.toContain(name);
    }
    expect(body).not.toContain(TEST_CLIENT_ADDRESS);
    expect(body).not.toMatch(upstreamUrl);
  }
});

test.describe("GET /api/chat/status (the warm-up check)", () => {
  test("admitted, then /health fails: 503 unavailable, typed and uncached", async ({ request }) => {
    const response = await request.get("/api/chat/status", { headers: PLATFORM_HEADERS });
    expect(response.status()).toBe(503);
    expect(await response.json()).toEqual({ state: "unavailable" });
    expect(response.headers()["cache-control"]).toBe("no-store");
  });

  test("without a platform client address it fails closed (503)", async ({ request }) => {
    const response = await request.get("/api/chat/status");
    expect(response.status()).toBe(503);
    expect((await response.json()).state).toBe("unavailable");
  });

  test("only GET exists: a POST is 405", async ({ request }) => {
    expect((await request.post("/api/chat/status", { data: {} })).status()).toBe(405);
  });
});
