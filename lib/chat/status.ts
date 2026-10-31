/*
 * The warm-up check behind GET /api/chat/status (ADR §8.4, "warm on intent").
 *
 * The Azure app scales to ZERO replicas when idle (that is what keeps it
 * inside the US$10/month cloud ceiling), and starting one takes about a
 * minute. Waiting that minute INSIDE a question would often hit the 75 s
 * question timeout. So when a visitor scrolls to the chat, the browser makes
 * ONE status request, and this handler calls the API's `/health`:
 *
 *   browser --GET /api/chat/status--> BFF --GET /health (no token, up to 90 s)--> ProcureRAG API
 *
 * `/health` is free: no retrieval, no model, no credential needed. Calling it
 * is enough to make Azure start a replica, and it answers once the replica
 * has loaded its models. By the time the visitor has read the presets and typed
 * a question, the service is usually awake.
 *
 * The same order of checks as the chat:
 *
 *   configuration or store missing?  -> 503 unavailable, nothing sent
 *   kill switch off, or unreadable?  -> 503 unavailable, nothing sent
 *   no trusted client address?       -> 503 unavailable, nothing counted or sent
 *   status limit reached (own caps)? -> 429 busy, nothing sent
 *   /health "ok" within 90 s         -> 200 ready
 *   /health still silent at 90 s     -> 504 waking
 *   anything else                    -> 503 unavailable
 *
 * Its OWN daily limits (lib/chat/admission.ts, 15 global, 3 per client),
 * separate from the 54 paid questions: each check can wake the replica and
 * keep it billing for about 6.5 minutes, so the checks are what must be
 * bounded, not the questions. No polling and no retry: one browser
 * request, at most one `/health` call.
 */

import { clientDigest, type Admission, type AdmissionStore } from "./admission";
import { isTimeout, readBodyWithLimit, storeFailure, type BffConfig } from "./bff";
import type { ServiceState, StatusView } from "./contract";

/**
 * How long the BFF waits for `/health`: above the measured cold starts
 * (59.07 s on Day 23, 71.5 s on Day 24), and below the route's 100 s
 * `maxDuration`, so this typed answer arrives before the platform cuts the
 * function off (ADR §8.4).
 */
export const HEALTH_TIMEOUT_MS = 90_000;

/** `/health` answers a few dozen bytes. 4 KiB is plenty, and keeps a strange reply from being buffered. */
export const MAX_HEALTH_BYTES = 4 * 1024;

/** One log line per status request. Never an address, a digest or an upstream body. */
export type StatusLogEntry = {
  at: string;
  route: "/api/chat/status";
  state: ServiceState;
  http_status: number;
  latency_ms: number;
  reason?: string;
  upstream_status?: number;
  store_error?: string;
  quota?: Admission["counters"];
};

export type StatusDeps = {
  config: BffConfig | null;
  store: AdmissionStore | null;
  /** The platform-reported client address (see `BffDeps.clientAddress`), or null. */
  clientAddress: string | null;
  fetchUpstream: (url: string, init: RequestInit) => Promise<Response>;
  now?: () => number;
  /** Override for tests only, so a "timeout" takes milliseconds instead of 90 s. */
  timeoutMs?: number;
  log?: (entry: StatusLogEntry) => void;
};

/** One status request in, one `StatusView` out. Never throws. */
export async function handleStatusRequest(deps: StatusDeps): Promise<Response> {
  const now = deps.now ?? Date.now;
  const startedAt = now();
  // Facts learned along the way (the quota counters), added to the log line.
  const facts: Partial<StatusLogEntry> = {};

  function reply(status: number, state: ServiceState, details: Partial<StatusLogEntry> = {}): Response {
    deps.log?.({
      at: new Date(startedAt).toISOString(),
      route: "/api/chat/status",
      state,
      http_status: status,
      latency_ms: now() - startedAt,
      ...facts,
      ...details,
    });
    const view: StatusView = { state };
    // `no-store`: a CDN must never answer "ready" from a cache while the
    // replica is asleep; every check must really ask.
    return Response.json(view, { status, headers: { "Cache-Control": "no-store" } });
  }

  // 1. Server-side checks, then the kill switch (read on every request, like the chat's).
  const { config, store } = deps;
  if (config === null) return reply(503, "unavailable", { reason: "missing_config" });
  if (store === null) return reply(503, "unavailable", { reason: "missing_store_config" });
  try {
    if (!(await store.isChatEnabled())) return reply(503, "unavailable", { reason: "kill_switch" });
  } catch (error) {
    return reply(503, "unavailable", { reason: "store_error", store_error: storeFailure(error) });
  }

  // 2. The status check's own limits, per client and global (fail closed without an address).
  if (deps.clientAddress === null) return reply(503, "unavailable", { reason: "no_client_address" });
  let admission: Admission;
  try {
    admission = await store.admitStatus({
      nowMs: startedAt,
      clientDigest: clientDigest(deps.clientAddress, config.clientHashSecret),
    });
  } catch (error) {
    return reply(503, "unavailable", { reason: "store_error", store_error: storeFailure(error) });
  }
  facts.quota = admission.counters;
  if (!admission.admitted) return reply(429, "busy", { reason: admission.reason });

  // 3. Exactly one `/health` call. No `Authorization` header: `/health` is
  //    open by design (the platform's probes need it), so the service token
  //    is not sent where it is not needed. No body, no query string: nothing
  //    from the browser goes upstream.
  let health: Response;
  let bytes: Uint8Array;
  try {
    health = await deps.fetchUpstream(`${config.apiUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(deps.timeoutMs ?? HEALTH_TIMEOUT_MS),
      redirect: "error",
    });
    if (health.status !== 200) {
      await health.body?.cancel();
      return reply(503, "unavailable", { upstream_status: health.status });
    }
    const read = await readBodyWithLimit(health, MAX_HEALTH_BYTES);
    if (read.kind === "too_large") return reply(503, "unavailable", { upstream_status: 200, reason: "health_too_large" });
    bytes = read.bytes;
  } catch (error) {
    // 90 s without an answer: the replica may still be starting. That is
    // "waking", not "unavailable": the next question may well work.
    if (isTimeout(error)) return reply(504, "waking");
    return reply(503, "unavailable", { reason: "network_error" });
  }

  // 4. "ready" only for the API's own healthy answer: a JSON object with
  //    `status: "ok"`. Anything else answering at that address is not ready.
  try {
    const body: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (typeof body === "object" && body !== null && (body as { status?: unknown }).status === "ok") {
      return reply(200, "ready", { upstream_status: 200 });
    }
  } catch {
    // not JSON: falls through
  }
  return reply(503, "unavailable", { upstream_status: 200, reason: "health_not_ok" });
}
