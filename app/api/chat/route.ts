/*
 * POST /api/chat: the same-origin BFF route the chat calls (ADR §3, §6).
 *
 * A Route Handler is a server-side function bound to a URL, written with the
 * Web `Request`/`Response` APIs. This file only exports `POST`, so any other
 * method gets `405 Method Not Allowed` from Next.js.
 *
 * Same origin: the browser calls `/api/chat` on the site it is already on, so
 * there is no cross-origin request and no CORS to configure. The browser
 * never learns the ProcureRAG API's address, the quota store, or any
 * credential: they live only in this server's environment.
 *
 * All request logic lives in lib/chat/bff.ts, which reads no environment
 * variable (so it can be tested with fakes). This file adds the things only a
 * real server has: the settings (lib/chat/server-config.ts), the client
 * address the platform reported, the real `fetch`, and the log.
 */

// A guard, not a feature: if a Client Component ever imported this file, the
// build would fail instead of shipping server code to browsers. (Next.js
// handles this import itself; the npm package is not needed.)
import "server-only";

import { trustedClientAddress } from "@/lib/chat/admission";
import { handleChatRequest } from "@/lib/chat/bff";
import { readServerSettings } from "@/lib/chat/server-config";

/**
 * Node.js, the default runtime, written out because the BFF depends on it
 * (Node's `fetch`, streams, `AbortSignal.timeout`, and `node:crypto` for the
 * client digest).
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

export async function POST(request: Request): Promise<Response> {
  const { config, store } = readServerSettings("/api/chat");
  return handleChatRequest(request, {
    config,
    // The quota store also holds the runtime kill switch (ADR §8.6), read on
    // every request. Flipping it needs no redeploy (docs/hosting-runbook.md).
    store,
    // Set by Vercel's proxy on a deployment; anyone can type it locally. See
    // `CLIENT_ADDRESS_HEADER` in lib/chat/admission.ts.
    clientAddress: trustedClientAddress(request.headers),
    fetchUpstream: (url, init) => fetch(url, init),
    // One JSON line per request: state, status, latency, preset id or
    // "free_text", quota counters, the lease's fate. Never the question, the
    // answer, a body, an address or a credential.
    log: (entry) => console.info(JSON.stringify(entry)),
  });
}
