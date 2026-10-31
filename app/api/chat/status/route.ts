/*
 * GET /api/chat/status: the warm-up check (ADR §8.4). The chat calls it once,
 * when the visitor scrolls the chat into view. The logic is in
 * lib/chat/status.ts; this file only wires in the real settings, address,
 * `fetch` and log, exactly like app/api/chat/route.ts.
 *
 * Only `GET` is exported, so any other method is a 405. A GET Route Handler
 * is not cached by Next.js unless it opts in, and this one reads the request's
 * headers, so it runs on every request, at request time.
 */

import "server-only";

import { trustedClientAddress } from "@/lib/chat/admission";
import { readServerSettings } from "@/lib/chat/server-config";
import { handleStatusRequest } from "@/lib/chat/status";

export const runtime = "nodejs";

/**
 * 100 s: above the BFF's 90 s wait for a cold `/health`, so the BFF answers
 * `waking` itself before the platform cuts the function off (ADR §8.4).
 */
export const maxDuration = 100;

export async function GET(request: Request): Promise<Response> {
  const { config, store } = readServerSettings("/api/chat/status");
  return handleStatusRequest({
    config,
    store,
    clientAddress: trustedClientAddress(request.headers),
    fetchUpstream: (url, init) => fetch(url, init),
    log: (entry) => console.info(JSON.stringify(entry)),
  });
}
