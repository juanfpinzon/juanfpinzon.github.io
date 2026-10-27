/*
 * POST /api/chat: the same-origin BFF route the chat calls (ADR §3, §6).
 *
 * A Route Handler is a server-side function bound to a URL, written with the
 * Web `Request`/`Response` APIs. This file only exports `POST`, so any other
 * method gets `405 Method Not Allowed` from Next.js.
 *
 * Same origin: the browser calls `/api/chat` on the site it is already on, so
 * there is no cross-origin request and no CORS to configure. The browser
 * never learns the ProcureRAG API's address or its credential: both live only
 * in this server's environment, and only this file reads them.
 *
 * All request logic lives in lib/chat/bff.ts, which reads no environment
 * variable (so it can be tested with fakes). This file adds the three things
 * that only a real server has: the environment, the real `fetch`, and the log.
 */

// A guard, not a feature: if a Client Component ever imported this file, the
// build would fail instead of shipping server code to browsers. (Next.js
// handles this import itself; the npm package is not needed.)
import "server-only";

import { handleChatRequest, type BffConfig } from "@/lib/chat/bff";

/**
 * Node.js, the default runtime, written out because the BFF depends on it
 * (Node's `fetch`, streams and `AbortSignal.timeout`).
 */
export const runtime = "nodejs";

/**
 * Route segment config (ADR §8.4): the longest a deployment platform may let
 * this function run, in seconds. 100 s is above the BFF's own 75 s upstream
 * timeout, so the BFF answers `timed_out` itself before the platform cuts
 * the function off, and below Vercel Hobby's 300 s maximum. The browser
 * waits 105 s (components/ChatPanel.tsx), so this typed answer arrives first.
 */
export const maxDuration = 100;

/**
 * The kill switch (ADR §8.6). Its storage is a Day 29 decision: it must be
 * read on every request, from somewhere that changes without a redeploy (a
 * build-time variable would not). Until then it is always on, and the way to
 * stop the local chat is to stop the server or remove one of the two
 * settings below, which also answers `unavailable`.
 */
const DEMO_ENABLED = true;

/**
 * The two server-only settings, read on EVERY request.
 *
 * - No `NEXT_PUBLIC_` prefix: Next.js copies only variables with that prefix
 *   into the browser's JavaScript, at build time. These two stay on the server.
 * - Read at request time: a POST handler runs per request and is never
 *   prerendered, so `process.env` here is the running server's environment.
 *   The same build works with different values (local, preview, production).
 * - Missing, blank or unusable: `null`, and the BFF answers `unavailable`.
 *   There is no fallback credential and no default URL.
 * - The API URL must be HTTPS, except on this machine (`localhost`,
 *   `127.0.0.1`) for the local proof: the token must never cross a network in
 *   plain text.
 * - The log line names which settings are missing, never their values.
 */
function readConfig(): BffConfig | null {
  const apiUrl = (process.env.PROCURERAG_API_URL ?? "").trim().replace(/\/+$/, "");
  const serviceToken = process.env.PROCURERAG_SERVICE_TOKEN ?? "";

  const problems: string[] = [];
  if (!apiUrl) {
    problems.push("PROCURERAG_API_URL is not set");
  } else if (!isAllowedApiUrl(apiUrl)) {
    problems.push("PROCURERAG_API_URL must be https:// (or http:// on localhost)");
  }
  if (!serviceToken.trim()) problems.push("PROCURERAG_SERVICE_TOKEN is not set");

  if (problems.length > 0) {
    console.error(JSON.stringify({ route: "/api/chat", event: "config_unusable", problems }));
    return null;
  }
  return { apiUrl, serviceToken };
}

function isAllowedApiUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  } catch {
    return false; // not a URL at all
  }
}

export async function POST(request: Request): Promise<Response> {
  return handleChatRequest(request, {
    config: readConfig(),
    demoEnabled: DEMO_ENABLED,
    fetchUpstream: (url, init) => fetch(url, init),
    // One JSON line per request: state, status, latency, preset id or
    // "free_text". Never the question, the answer, a body or the token.
    log: (entry) => console.info(JSON.stringify(entry)),
  });
}
