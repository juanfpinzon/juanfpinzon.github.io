import http from "node:http";
import { expect, test } from "@playwright/test";
import { PLACEHOLDER_SERVICE_TOKEN, TEST_UPSTREAM_URL } from "./routes";

/*
 * The REAL route (app/api/chat/route.ts), built by `npm run build`, served by
 * `next start`, and called over HTTP.
 *
 * tests/chat-bff.spec.ts tests the BFF's logic with a fake upstream. This file
 * proves the built route is wired to that logic: the server-only settings are
 * read at request time, the byte cap holds on a real socket, a real refused
 * connection fails closed, and nothing a browser receives holds a server-only
 * value.
 *
 * The test server's upstream is port 1 on this machine, where nothing listens
 * (tests/routes.ts), so no ProcureRAG service is needed. Every question that
 * passes the BFF's checks therefore ends as 503 `unavailable`, which is how
 * these tests can tell "refused by the BFF" (413/422) from "sent upstream".
 */

const GRNI = "What does GRNI mean?";

test("only POST exists: a GET is 405", async ({ request }) => {
  expect((await request.get("/api/chat")).status()).toBe(405);
});

test("a valid question passes every check, then the refused upstream connection is 503 unavailable", async ({
  request,
}) => {
  const response = await request.post("/api/chat", { data: { question: GRNI } });

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
  const answer = await (await request.post("/api/chat", { data: { question: GRNI } })).text();

  // The upstream URL as a pattern: "127.0.0.1:1" must not match a longer port such as ":3100".
  const upstreamUrl = new RegExp(`${TEST_UPSTREAM_URL.replaceAll(".", "\\.")}(?!\\d)`);
  for (const body of [html, ...scripts, answer]) {
    expect(body).not.toContain(PLACEHOLDER_SERVICE_TOKEN);
    expect(body).not.toContain("PROCURERAG_SERVICE_TOKEN");
    expect(body).not.toContain("PROCURERAG_API_URL");
    expect(body).not.toMatch(upstreamUrl);
  }
});
