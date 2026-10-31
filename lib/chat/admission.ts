/*
 * Admission: may this question start a paid call right now? (ADR §8.3, §8.3.1)
 *
 * Before the BFF calls ProcureRAG, each question must be ADMITTED. Three
 * limits protect three different things:
 *
 *   global     54 questions per UTC day, all visitors together
 *              -> the LLM budget: 54 x US$0.0030525 (worst case) x 30 days = US$4.94 < US$5
 *   client     10 questions per UTC day per client
 *              -> one visitor cannot spend everybody's 54
 *   in flight  2 questions at the same time
 *              -> the single 1-vCPU Azure replica is never flooded
 *
 * WHY A STORE OUTSIDE THIS PROCESS: Vercel runs the BFF as many short-lived
 * copies of one function. A counter in a variable would exist once per copy
 * and vanish on the next cold start, so "54 a day" would mean nothing. The
 * counters live in Redis, which every copy shares.
 *
 * WHY ONE ATOMIC STEP: "read the counters, decide, then write" done as three
 * separate calls lets two copies both read 53 and both write 54: 55 admitted.
 * The check and the update must happen as ONE indivisible step in the store.
 * In Redis that step is a Lua script (lib/chat/upstash-admission.ts): Redis runs a
 * script from start to finish, and no other command runs in between.
 *
 * WHY A LEASE PER REQUEST, NOT AN IN-FLIGHT COUNTER (ADR §8.3.1): a counter
 * cannot tell WHICH request finished, and its expiry is shared by everybody.
 * Instead, each admitted request adds one member to a Redis sorted set: its own
 * random lease id, scored with the time the lease expires. "How many in
 * flight?" is "how many members, after dropping the expired ones". Releasing
 * removes exactly that one member, so releasing twice, or after expiry, is
 * harmless.
 *
 * This file is PROVIDER-NEUTRAL: the numbers, the store interface, key names,
 * the UTC day, and the client digest. The one real store is
 * lib/chat/upstash-admission.ts. The tests use fakes, plus one real-store test.
 */

import { createHmac, randomUUID } from "node:crypto";
import { isIP } from "node:net";

// ---------------------------------------------------------------------------
// The policy: every limit, in one place.
// ---------------------------------------------------------------------------

/** Paid questions per UTC day, all clients together (Day 28's cost decision). */
export const CHAT_GLOBAL_DAILY_CAP = 54;
/** Paid questions per UTC day from one client (ADR §8.3). */
export const CHAT_CLIENT_DAILY_CAP = 10;
/** Questions running upstream at the same time (one 1-vCPU replica, ADR §8.3). */
export const CHAT_IN_FLIGHT_CAP = 2;

/**
 * How long a lease holds an in-flight slot if nobody releases it.
 *
 * A lease is released early only when the BFF KNOWS the upstream work is over
 * (a complete reply, or a connection that was never made). After a BFF
 * timeout, the work may still be running on Azure, so the lease must outlive
 * the worst case FROM ADMISSION:
 *
 *   Azure cold start (measured 59-72 s, Day 23/24)
 *   + retrieval (a few seconds on 1 vCPU)
 *   + ONE provider call (60 s timeout, with SDK retries off)
 *   = about 140 s, so 180 s leaves a margin of about 40 s.
 *
 * PROVISIONAL: Day 29 Block 5 measures the deployed chain and re-derives it.
 * If any of those timeouts grows, this number must be re-derived too.
 */
export const LEASE_TTL_MS = 180_000;

/**
 * Warm-up checks per UTC day: their OWN limits, separate from the paid 54.
 *
 * Each admitted status check can wake the scaled-to-zero replica, and a woken
 * replica bills until it scales back to zero:
 *
 *   up to 90 s waiting for /health + 300 s idle cooldown = 390 s = 6.5 min
 *
 * The Container Apps monthly free grant (180,000 vCPU-s and 360,000 GiB-s) is
 * 50 hours of a 1 vCPU / 2 GiB replica, i.e. 100 minutes a day.
 * floor(100 / 6.5) = 15 wakes a day stay inside it even when every check finds
 * the replica asleep. 3 per client: one visit, plus a couple of reloads.
 *
 * What this does NOT bound: anyone can still call the public Azure URL
 * directly and wake it (ADR §8.4 residual risk). The cap stops the BFF from
 * being the tool that keeps the replica warm all day.
 */
export const STATUS_GLOBAL_DAILY_CAP = 15;
export const STATUS_CLIENT_DAILY_CAP = 3;

/**
 * Daily counter keys carry their UTC date in the NAME (see `chatKeys`), so a
 * new day starts at 0 because it is a new key, not because an old one expired.
 * Expiry only cleans up: each counter lives until the end of its UTC day plus
 * this hour of grace, so a function copy whose clock runs slightly late never
 * finds yesterday's key already gone.
 */
export const COUNTER_GRACE_SECONDS = 3_600;

/** First part of every key, so the demo's keys are easy to find and never collide. */
export const KEY_PREFIX = "procurerag-demo";

// ---------------------------------------------------------------------------
// The store interface. Any implementation must keep these promises.
// ---------------------------------------------------------------------------

/** Why an admission ended the way it did. Only "admitted" lets the call happen. */
export type AdmissionReason = "admitted" | "global_cap" | "client_cap" | "in_flight_cap";

/**
 * The result of one admission attempt. The counters are AFTER the attempt and
 * are safe to log: numbers only, never an address or a digest.
 */
export type Admission = {
  admitted: boolean;
  reason: AdmissionReason;
  counters: { global: number; client: number; in_flight: number };
};

/**
 * Every method THROWS when the store cannot give a trustworthy answer
 * (unreachable, timed out, refused our token, sent something unexpected). The
 * handlers turn any throw into `unavailable` and call nothing upstream: a
 * broken store must never be read as "no limit reached" (fail closed).
 */
export interface AdmissionStore {
  /** The runtime kill switch: true only if its key holds exactly "true". */
  isChatEnabled(): Promise<boolean>;
  /** One atomic step: check all three chat limits; if none is reached, take a lease and count once. */
  admitChat(input: { nowMs: number; clientDigest: string; leaseId: string }): Promise<Admission>;
  /** Give back one lease. Idempotent: an unknown or expired lease id changes nothing. */
  releaseChat(leaseId: string): Promise<void>;
  /** The status route's own two daily limits (no lease: /health is free and quick). */
  admitStatus(input: { nowMs: number; clientDigest: string }): Promise<Admission>;
}

// ---------------------------------------------------------------------------
// Key names.
// ---------------------------------------------------------------------------

/**
 * The namespace of every key: `procurerag-demo:<budget domain>`.
 *
 * The budget domain names the OpenRouter key that pays (a server-only
 * setting, e.g. "or-demo-2026-10"). Every deployment that spends the SAME
 * provider key must use the SAME domain, so they all count against ONE global
 * 54/day: a preview and production with separate counters would share one
 * key but get 54 each. A new provider key gets a new domain, and with it
 * fresh counters. Tests use a random domain, so they never touch real keys.
 */
export function storeNamespace(budgetDomain: string): string {
  return `${KEY_PREFIX}:${budgetDomain}`;
}

/** A budget domain is part of every key, so it is kept to a small, safe alphabet. */
export function isValidBudgetDomain(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,39}$/.test(value);
}

/** The kill switch, shared by every deployment in the budget domain. */
export function killSwitchKey(namespace: string): string {
  return `${namespace}:chat:enabled`;
}

/** The in-flight lease set. One per budget domain: concurrency is not counted per day or per client. */
export function inFlightKey(namespace: string): string {
  return `${namespace}:chat:in_flight`;
}

/** The three keys the chat admission script reads and writes. */
export function chatKeys(namespace: string, nowMs: number, clientDigest: string) {
  const day = utcDay(nowMs);
  return {
    inFlight: inFlightKey(namespace),
    global: `${namespace}:chat:global:${day}`,
    client: `${namespace}:chat:client:${day}:${clientDigest}`,
  };
}

/** The two keys of the status route's own daily limits. */
export function statusKeys(namespace: string, nowMs: number, clientDigest: string) {
  const day = utcDay(nowMs);
  return {
    global: `${namespace}:status:global:${day}`,
    client: `${namespace}:status:client:${day}:${clientDigest}`,
  };
}

// ---------------------------------------------------------------------------
// The UTC day. `nowMs` always comes from the caller, never from a clock in
// here, so tests can put "now" one millisecond before midnight.
// ---------------------------------------------------------------------------

/** The UTC calendar day of `nowMs`, e.g. "2026-10-28". Every visitor shares it, whatever their time zone. */
export function utcDay(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

/** Whole seconds until the next 00:00 UTC (at least 1): when the daily limits reset. */
export function secondsUntilUtcMidnight(nowMs: number): number {
  const now = new Date(nowMs);
  const nextMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((nextMidnight - nowMs) / 1000));
}

/** How long a daily counter key lives: to the end of its day, plus the grace hour. Always under 25 hours. */
export function counterTtlSeconds(nowMs: number): number {
  return secondsUntilUtcMidnight(nowMs) + COUNTER_GRACE_SECONDS;
}

// ---------------------------------------------------------------------------
// Who is the client? (ADR §8.3: "keyed by a salted hash of the client IP from
// Vercel's platform-set headers, never from a browser-supplied header")
// ---------------------------------------------------------------------------

/**
 * The header Vercel's proxy sets to the address of the client it received the
 * request from. Vercel OVERWRITES the forwarded-for headers to prevent
 * spoofing, so on a deployment the value is the platform's, not the visitor's.
 *
 * That trust exists only behind Vercel. On `next start` on a laptop nothing
 * overwrites it, and any caller can type any value. So local tests may send
 * it to reach the admission step, but that proves only the wiring. The
 * deployed proof (Block 5) sends forged values and shows they are ignored.
 */
export const CLIENT_ADDRESS_HEADER = "x-vercel-forwarded-for";

/**
 * The client address, or null when it cannot be trusted to be ONE address.
 *
 * Missing, blank, a list ("1.2.3.4, 5.6.7.8") or anything that is not a valid
 * IPv4/IPv6 address all give null, and the caller then refuses the request
 * (fails closed): with no address there is no per-client limit to enforce.
 * Lower case, so one IPv6 address written in two letter cases is one client.
 */
export function trustedClientAddress(headers: Headers): string | null {
  const value = (headers.get(CLIENT_ADDRESS_HEADER) ?? "").trim().toLowerCase();
  return isIP(value) === 0 ? null : value;
}

/**
 * The per-client key part: HMAC-SHA-256 of the address, with a server-only secret.
 *
 * Why not store the address: an IP address is personal data, and the store
 * does not need it. It needs only "the same client again?".
 *
 * Why not a plain SHA-256 of it: there are only about 4.3 billion IPv4
 * addresses. Anyone holding a plain hash can hash all of them in minutes and
 * find the match. An HMAC mixes in a secret key that never leaves the server,
 * so without the key the digest reveals nothing, and it cannot be recomputed.
 *
 * Rotating the secret changes every digest, which also resets every client's
 * daily count. That is acceptable, since the global cap still holds.
 */
export function clientDigest(address: string, secret: string): string {
  return createHmac("sha256", secret).update(address).digest("hex");
}

/** A fresh, unguessable lease id for one request (random, not derived from anything about it). */
export function newLeaseId(): string {
  return randomUUID();
}
