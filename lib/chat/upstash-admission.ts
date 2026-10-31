/*
 * The admission store, implemented on Upstash Redis over its REST API.
 *
 * Upstash is Redis reached over HTTPS: every command is one POST whose body
 * is the command as a JSON array, and the reply is `{"result": ...}` or
 * `{"error": "..."}`. That suits a serverless function, which cannot keep a
 * pool of TCP connections open between requests.
 *
 *   POST https://<db>.upstash.io
 *   Authorization: Bearer <token>
 *   ["EVAL", "<lua script>", "3", "<key 1>", "<key 2>", "<key 3>", "<arg 1>", ...]
 *   -> 200 {"result": [1, "admitted", 7, 2, 1]}
 *
 * Plain `fetch`, no SDK, for two reasons:
 * 1. NO RETRIES. If an EVAL ran in Redis but its reply was lost on the way
 *    back, a retry would run it AGAIN: two charges and two leases for one
 *    question. Here, one call is one attempt, and any failure is final.
 * 2. Every byte that crosses the network is visible in this file.
 *
 * The atomic logic is in the two Lua scripts below. This TypeScript only builds
 * the key names and arguments, sends one command, and checks the reply.
 */

import {
  CHAT_CLIENT_DAILY_CAP,
  CHAT_GLOBAL_DAILY_CAP,
  CHAT_IN_FLIGHT_CAP,
  LEASE_TTL_MS,
  STATUS_CLIENT_DAILY_CAP,
  STATUS_GLOBAL_DAILY_CAP,
  chatKeys,
  counterTtlSeconds,
  inFlightKey,
  killSwitchKey,
  statusKeys,
  type Admission,
  type AdmissionReason,
  type AdmissionStore,
} from "./admission";

/**
 * How long one store command may take. Upstash in the same region answers in
 * milliseconds, so 3 s means something is wrong, and the request fails closed.
 */
export const STORE_TIMEOUT_MS = 3_000;

/**
 * Any failure to get a trustworthy answer from the store.
 *
 * The message is a fixed phrase chosen here ("store timed out", "store
 * answered HTTP 401", ...), so it is safe to log: it never holds the URL, the
 * token, a key name (which contains a client digest) or the store's own text.
 */
export class StoreError extends Error {
  override name = "StoreError";
}

// ---------------------------------------------------------------------------
// The two Lua scripts. Redis runs each one ATOMICALLY: from its first line to
// its last, no other command (from any other copy of the BFF) runs in between.
// So "check every limit, then take a slot" cannot be split by a competitor.
//
// Rules the scripts follow (Upstash EVAL docs, ADR §8.3.1):
// - every key is passed in KEYS, never built inside the script;
// - "now" comes in ARGV from the BFF. The script never reads a clock, so
//   tests can choose "now", and every number it compares is in the same unit;
// - all limits are checked BEFORE anything is written, so a refusal changes
//   nothing (no reservation to roll back);
// - `redis.call('GET', key)` returns false (not nil) for a missing key in
//   Lua, hence `or '0'`.
// ---------------------------------------------------------------------------

/**
 * Chat admission: three limits, one lease.
 *
 * KEYS[1] in-flight sorted set (member = lease id, score = lease expiry in ms)
 * KEYS[2] global counter of this UTC day
 * KEYS[3] this client's counter of this UTC day
 * ARGV    now_ms, lease_id, lease_ttl_ms, global_cap, client_cap, in_flight_cap, counter_ttl_s
 *
 * Returns {admitted 0|1, reason, global, client, in_flight}: the counts after
 * this attempt. Numbers only, safe to log.
 */
export const CHAT_ADMISSION_SCRIPT = `
local now = tonumber(ARGV[1])

-- 1. Forget leases whose expiry time has passed (their requests are presumed over).
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now)

-- 2. Read the three numbers.
local in_flight = redis.call('ZCARD', KEYS[1])
local global = tonumber(redis.call('GET', KEYS[2]) or '0')
local client = tonumber(redis.call('GET', KEYS[3]) or '0')

-- 3. Any limit reached: refuse, and write nothing.
if global >= tonumber(ARGV[4]) then return {0, 'global_cap', global, client, in_flight} end
if client >= tonumber(ARGV[5]) then return {0, 'client_cap', global, client, in_flight} end
if in_flight >= tonumber(ARGV[6]) then return {0, 'in_flight_cap', global, client, in_flight} end

-- 4. Admit: exactly one lease, and each daily counter charged exactly once.
redis.call('ZADD', KEYS[1], now + tonumber(ARGV[3]), ARGV[2])
global = redis.call('INCR', KEYS[2])
client = redis.call('INCR', KEYS[3])

-- 5. Bounded expiry, for clean-up only. A day's counters die after their day
--    (plus grace). The lease set dies a minute after its newest lease would:
--    by then every lease in it has expired anyway.
redis.call('EXPIRE', KEYS[2], ARGV[7])
redis.call('EXPIRE', KEYS[3], ARGV[7])
redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[3]) + 60000)

return {1, 'admitted', global, client, in_flight + 1}
`;

/**
 * Status admission: the warm-up check's own two daily limits. No lease: a
 * `/health` call is free and short, and the status route needs no slot.
 *
 * KEYS[1] status global counter of this UTC day
 * KEYS[2] this client's status counter of this UTC day
 * ARGV    global_cap, client_cap, counter_ttl_s
 *
 * Returns the same five-element shape as the chat script, with in_flight 0,
 * so one parser reads both.
 */
export const STATUS_ADMISSION_SCRIPT = `
local global = tonumber(redis.call('GET', KEYS[1]) or '0')
local client = tonumber(redis.call('GET', KEYS[2]) or '0')

if global >= tonumber(ARGV[1]) then return {0, 'global_cap', global, client, 0} end
if client >= tonumber(ARGV[2]) then return {0, 'client_cap', global, client, 0} end

global = redis.call('INCR', KEYS[1])
client = redis.call('INCR', KEYS[2])
redis.call('EXPIRE', KEYS[1], ARGV[3])
redis.call('EXPIRE', KEYS[2], ARGV[3])

return {1, 'admitted', global, client, 0}
`;

// ---------------------------------------------------------------------------
// Talking to Upstash.
// ---------------------------------------------------------------------------

export type UpstashSettings = {
  /** The database's REST URL (https). */
  url: string;
  /** The database's REST token: a full read/write credential, server-only. */
  token: string;
  /** `storeNamespace(budgetDomain)`: the first part of every key. */
  namespace: string;
  /** The real `fetch` by default; tests pass a fake that records each command. */
  fetch?: (url: string, init: RequestInit) => Promise<Response>;
  /** Tests only: a shorter timeout. */
  timeoutMs?: number;
};

/** True for the error `fetch` throws when `AbortSignal.timeout(...)` fires. */
function isTimeoutError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { name?: unknown }).name === "TimeoutError";
}

/**
 * Send ONE command and return its `result`. Throws a `StoreError` for anything
 * else: unreachable, too slow, an HTTP error (a wrong token is 401), an
 * `{"error": ...}` reply (e.g. a Lua error), or a reply that is not JSON.
 * Never retries.
 *
 * Every argument is sent as a string. Redis arguments ARE strings (it parses
 * numbers itself), so this removes any doubt about how a number is encoded.
 */
export async function sendCommand(settings: UpstashSettings, command: (string | number)[]): Promise<unknown> {
  const send = settings.fetch ?? fetch;
  let response: Response;
  try {
    response = await send(settings.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${settings.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(command.map(String)),
      signal: AbortSignal.timeout(settings.timeoutMs ?? STORE_TIMEOUT_MS),
      // The store never redirects; following one could carry the token elsewhere.
      redirect: "error",
    });
  } catch (error) {
    // Note: after a TIMEOUT the command may still have run in Redis. For an
    // admission that means a charge and a lease nobody will use. That is the
    // safe direction: the counter only over-counts, and the lease expires.
    throw new StoreError(isTimeoutError(error) ? "store timed out" : "store unreachable");
  }

  if (response.status !== 200) {
    await response.body?.cancel();
    throw new StoreError(`store answered HTTP ${response.status}`);
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new StoreError("store reply is not JSON");
  }
  if (typeof body !== "object" || body === null || !("result" in body)) {
    throw new StoreError("store reply has no result");
  }
  return (body as { result: unknown }).result;
}

const ADMISSION_REASONS: readonly AdmissionReason[] = ["admitted", "global_cap", "client_cap", "in_flight_cap"];

const isCount = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;

/**
 * Check a script's reply at runtime, like the BFF checks the API's reply.
 *
 * Exactly `[0|1, reason, global, client, in_flight]`, with "admitted" if and
 * only if the flag is 1. Anything else (an older script, a Lua error turned
 * into something odd, a proxy's page) throws, and the request fails closed.
 */
export function parseAdmissionReply(reply: unknown): Admission {
  if (!Array.isArray(reply) || reply.length !== 5) throw new StoreError("admission reply has the wrong shape");
  const [flag, reason, global, client, inFlight] = reply;
  if (
    (flag !== 0 && flag !== 1) ||
    !ADMISSION_REASONS.includes(reason as AdmissionReason) ||
    !isCount(global) ||
    !isCount(client) ||
    !isCount(inFlight) ||
    (flag === 1) !== (reason === "admitted")
  ) {
    throw new StoreError("admission reply has the wrong shape");
  }
  return {
    admitted: flag === 1,
    reason: reason as AdmissionReason,
    counters: { global, client, in_flight: inFlight },
  };
}

/** The real store. Each method is one command, so each is one network round trip. */
export function createUpstashStore(settings: UpstashSettings): AdmissionStore {
  const { namespace } = settings;

  return {
    async isChatEnabled() {
      const value = await sendCommand(settings, ["GET", killSwitchKey(namespace)]);
      // A missing key is `null`. Only the exact string "true" turns the chat
      // on: a typo, "1", "yes" or a deleted key all mean OFF (fail closed).
      if (value !== null && typeof value !== "string") throw new StoreError("kill switch reply is not a string");
      return value === "true";
    },

    async admitChat({ nowMs, clientDigest, leaseId }) {
      const keys = chatKeys(namespace, nowMs, clientDigest);
      const reply = await sendCommand(settings, [
        "EVAL",
        CHAT_ADMISSION_SCRIPT,
        3, // how many of the following arguments are KEYS; the rest are ARGV
        keys.inFlight,
        keys.global,
        keys.client,
        nowMs,
        leaseId,
        LEASE_TTL_MS,
        CHAT_GLOBAL_DAILY_CAP,
        CHAT_CLIENT_DAILY_CAP,
        CHAT_IN_FLIGHT_CAP,
        counterTtlSeconds(nowMs),
      ]);
      return parseAdmissionReply(reply);
    },

    async releaseChat(leaseId) {
      // ZREM removes this one member and answers how many it removed: 1, or 0
      // when the lease was already released or expired. Both are fine.
      const reply = await sendCommand(settings, ["ZREM", inFlightKey(namespace), leaseId]);
      if (reply !== 0 && reply !== 1) throw new StoreError("release reply is not 0 or 1");
    },

    async admitStatus({ nowMs, clientDigest }) {
      const keys = statusKeys(namespace, nowMs, clientDigest);
      const reply = await sendCommand(settings, [
        "EVAL",
        STATUS_ADMISSION_SCRIPT,
        2,
        keys.global,
        keys.client,
        STATUS_GLOBAL_DAILY_CAP,
        STATUS_CLIENT_DAILY_CAP,
        counterTtlSeconds(nowMs),
      ]);
      return parseAdmissionReply(reply);
    },
  };
}
