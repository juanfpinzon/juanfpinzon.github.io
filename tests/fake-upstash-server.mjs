/*
 * A stand-in for Upstash's REST API, for the Playwright test server ONLY.
 *
 *   node tests/fake-upstash-server.mjs <port> <token>
 *
 * Since Day 29 the chat routes read a quota store on every request: the kill
 * switch first, then one admission. The built app under test
 * (playwright.config.ts) therefore needs SOMETHING at its store URL, or every
 * request would stop at "unavailable" before the checks the route tests are
 * about (413, 422, the secret boundary).
 *
 * What it answers (the same wire format as Upstash: a JSON array in, a
 * `{"result": ...}` out):
 *   - a missing or wrong Bearer token -> 401, so the tests also prove the
 *     route sends the store token;
 *   - GET of the kill-switch key       -> "true" (chat on);
 *   - EVAL (an admission)              -> always "admitted";
 *   - ZREM (a release)                 -> 1.
 *
 * What it CANNOT prove: anything about the Lua scripts. It never runs them,
 * it just says "admitted". The scripts' atomic behaviour is proven against a
 * real Redis in tests/chat-admission-redis.spec.ts.
 */

import http from "node:http";

const [port, token] = process.argv.slice(2);
if (!port || !token) {
  console.error("usage: node tests/fake-upstash-server.mjs <port> <token>");
  process.exit(2);
}

/** One canned answer per command name. */
function answer(command) {
  const [name, key] = command;
  switch (String(name).toUpperCase()) {
    case "GET":
      return { status: 200, body: { result: String(key).endsWith(":chat:enabled") ? "true" : null } };
    case "EVAL":
      // [admitted, reason, global, client, in_flight]: the shape both scripts return.
      return { status: 200, body: { result: [1, "admitted", 1, 1, 1] } };
    case "ZREM":
      return { status: 200, body: { result: 1 } };
    default:
      return { status: 400, body: { error: `ERR fake store does not support ${name}` } };
  }
}

http
  .createServer((request, response) => {
    let raw = "";
    request.on("data", (chunk) => (raw += chunk));
    request.on("end", () => {
      let reply;
      if (request.method !== "POST") {
        reply = { status: 405, body: { error: "only POST" } };
      } else if (request.headers.authorization !== `Bearer ${token}`) {
        reply = { status: 401, body: { error: "WRONGPASS invalid token" } };
      } else {
        try {
          reply = answer(JSON.parse(raw));
        } catch {
          reply = { status: 400, body: { error: "ERR body is not a JSON array" } };
        }
      }
      response.writeHead(reply.status, { "Content-Type": "application/json" });
      response.end(JSON.stringify(reply.body));
    });
  })
  .listen(Number(port), "127.0.0.1");
