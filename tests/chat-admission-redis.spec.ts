import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
  CHAT_CLIENT_DAILY_CAP,
  CHAT_GLOBAL_DAILY_CAP,
  CHAT_IN_FLIGHT_CAP,
  LEASE_TTL_MS,
  STATUS_CLIENT_DAILY_CAP,
  STATUS_GLOBAL_DAILY_CAP,
  chatKeys,
  inFlightKey,
  killSwitchKey,
  statusKeys,
  storeNamespace,
  type AdmissionStore,
} from "@/lib/chat/admission";
import { createUpstashStore, sendCommand, type UpstashSettings } from "@/lib/chat/upstash-admission";

/*
 * The Lua scripts against a REAL Redis (the Day 29 "real-store proof").
 *
 * A fake `fetch` sees the scripts only as text. Whether they really refuse
 * the 55th request, admit exactly 2 of 10 simultaneous ones, and prune
 * expired leases can only be shown by running them where they run in
 * production. This file does that.
 *
 * It runs ONLY when both variables are set, and is skipped otherwise (so
 * `npm test` never needs a network or a credential):
 *
 *   ADMISSION_TEST_REDIS_REST_URL=https://<db>.upstash.io \
 *   ADMISSION_TEST_REDIS_REST_TOKEN=<token> \
 *   npx playwright test tests/chat-admission-redis.spec.ts
 *
 * The names are deliberately NOT the app's own (UPSTASH_REDIS_REST_*), so a
 * shell set up for the app never runs this by accident.
 *
 * ISOLATION: each test uses its own random namespace
 * (`procurerag-demo:test-<8 hex>`), so it can never touch the real
 * production keys or another test's keys, and tests may run in parallel.
 * Every key a test touches is recorded and DELeted at the end, even if the
 * test fails. Only those keys: no pattern delete, no FLUSH.
 *
 * TIME: every call passes its own `nowMs`, as the BFF does, so a test can
 * jump past a lease's expiry or across midnight without waiting.
 */

const url = process.env.ADMISSION_TEST_REDIS_REST_URL ?? "";
const token = process.env.ADMISSION_TEST_REDIS_REST_TOKEN ?? "";

test.skip(!url || !token, "set ADMISSION_TEST_REDIS_REST_URL and ADMISSION_TEST_REDIS_REST_TOKEN to run the real-store proof");

/** A fixed, ordinary moment: 2026-10-28 12:00:00 UTC. */
const NOON = Date.UTC(2026, 9, 28, 12, 0, 0);

/** A client digest per number: the shape of a real one, but obviously made up. */
const client = (n: number) => n.toString(16).padStart(64, "0");

/** One isolated store per test, plus raw access for checks and the clean-up list. */
function isolatedStore() {
  const namespace = storeNamespace(`test-${randomUUID().slice(0, 8)}`);
  const settings: UpstashSettings = { url, token, namespace };
  const touched = new Set<string>([inFlightKey(namespace), killSwitchKey(namespace)]);
  const store: AdmissionStore = createUpstashStore(settings);

  /** Remember the keys of this (now, client), so clean-up can delete exactly them. */
  function track(nowMs: number, digest: string) {
    for (const key of Object.values(chatKeys(namespace, nowMs, digest))) touched.add(key);
    for (const key of Object.values(statusKeys(namespace, nowMs, digest))) touched.add(key);
  }
  const admit = (nowMs: number, digest: string, leaseId: string = randomUUID()) => {
    track(nowMs, digest);
    return store.admitChat({ nowMs, clientDigest: digest, leaseId });
  };
  const admitStatus = (nowMs: number, digest: string) => {
    track(nowMs, digest);
    return store.admitStatus({ nowMs, clientDigest: digest });
  };
  /** Read Redis directly, to check what a refusal did NOT change. */
  const raw = (...command: (string | number)[]) => sendCommand(settings, command);
  const cleanUp = () => raw("DEL", ...touched);

  return { namespace, store, admit, admitStatus, raw, cleanUp };
}

test("global: the 55th question of a day is refused, and the refusal changes nothing", async () => {
  const redis = isolatedStore();
  try {
    // 54 different clients, one question each, each released at once so the
    // 2-in-flight limit never interferes. Sequential on purpose: this test is
    // about the count, the race test is below.
    for (let n = 0; n < CHAT_GLOBAL_DAILY_CAP; n++) {
      const leaseId = `lease-${n}`;
      expect((await redis.admit(NOON, client(n), leaseId)).admitted, `question ${n + 1}`).toBe(true);
      await redis.store.releaseChat(leaseId);
    }

    const refusal = await redis.admit(NOON, client(999), "lease-55");
    expect(refusal).toEqual({ admitted: false, reason: "global_cap", counters: { global: 54, client: 0, in_flight: 0 } });

    // Nothing moved: the global counter is still 54, the refused client has
    // no counter at all, and no lease was taken.
    const keys = chatKeys(redis.namespace, NOON, client(999));
    expect(await redis.raw("GET", keys.global)).toBe("54");
    expect(await redis.raw("GET", keys.client)).toBeNull();
    expect(await redis.raw("ZCARD", keys.inFlight)).toBe(0);
  } finally {
    await redis.cleanUp();
  }
});

test("client: the 11th question from one client is refused while another client still gets in", async () => {
  const redis = isolatedStore();
  try {
    for (let n = 0; n < CHAT_CLIENT_DAILY_CAP; n++) {
      expect((await redis.admit(NOON, client(1), `a-${n}`)).admitted).toBe(true);
      await redis.store.releaseChat(`a-${n}`);
    }
    expect(await redis.admit(NOON, client(1), "a-11")).toMatchObject({ admitted: false, reason: "client_cap" });
    expect(await redis.admit(NOON, client(2), "b-1")).toMatchObject({ admitted: true, counters: { global: 11, client: 1 } });
  } finally {
    await redis.cleanUp();
  }
});

test("in flight: 10 simultaneous admissions on an empty store admit EXACTLY 2", async () => {
  const redis = isolatedStore();
  try {
    // All ten requests leave at once. Without atomicity, several could read
    // "0 in flight" before any of them wrote, and more than 2 would get in.
    const results = await Promise.all(Array.from({ length: 10 }, (_, n) => redis.admit(NOON, client(n), `race-${n}`)));

    expect(results.filter((r) => r.admitted)).toHaveLength(CHAT_IN_FLIGHT_CAP);
    expect(results.filter((r) => !r.admitted).every((r) => r.reason === "in_flight_cap")).toBe(true);
    const keys = chatKeys(redis.namespace, NOON, client(0));
    expect(await redis.raw("ZCARD", keys.inFlight)).toBe(2);
    // Refusals were not charged: only the 2 admitted questions are counted.
    expect(await redis.raw("GET", keys.global)).toBe("2");
  } finally {
    await redis.cleanUp();
  }
});

test("release frees only its own lease; a double or unknown release is harmless", async () => {
  const redis = isolatedStore();
  try {
    await redis.admit(NOON, client(1), "lease-a");
    await redis.admit(NOON, client(2), "lease-b");
    expect((await redis.admit(NOON, client(3), "lease-c")).reason).toBe("in_flight_cap");

    await redis.store.releaseChat("lease-a");
    await redis.store.releaseChat("lease-a"); // again: nothing happens
    await redis.store.releaseChat("never-existed"); // unknown: nothing happens

    const inFlight = inFlightKey(redis.namespace);
    expect(await redis.raw("ZRANGE", inFlight, 0, -1)).toEqual(["lease-b"]);
    // Exactly one slot came back, so exactly one new question gets in.
    expect((await redis.admit(NOON, client(3), "lease-c")).admitted).toBe(true);
    expect((await redis.admit(NOON, client(4), "lease-d")).reason).toBe("in_flight_cap");
  } finally {
    await redis.cleanUp();
  }
});

test("an expired lease is pruned before counting; a live one is not", async () => {
  const redis = isolatedStore();
  try {
    await redis.admit(NOON, client(1), "old-a");
    await redis.admit(NOON, client(2), "old-b");

    // One millisecond before expiry, both leases still hold their slots.
    expect((await redis.admit(NOON + LEASE_TTL_MS - 1, client(3), "early")).reason).toBe("in_flight_cap");
    // At expiry they are dropped, so the next question gets in.
    const later = await redis.admit(NOON + LEASE_TTL_MS, client(3), "on-time");
    expect(later).toMatchObject({ admitted: true, counters: { in_flight: 1 } });
    expect(await redis.raw("ZRANGE", inFlightKey(redis.namespace), 0, -1)).toEqual(["on-time"]);
  } finally {
    await redis.cleanUp();
  }
});

test("UTC midnight: a client that used up today can ask again at 00:00:00.000", async () => {
  const redis = isolatedStore();
  const lastMs = Date.UTC(2026, 9, 28, 23, 59, 59, 999);
  try {
    for (let n = 0; n < CHAT_CLIENT_DAILY_CAP; n++) {
      await redis.admit(lastMs, client(1), `day1-${n}`);
      await redis.store.releaseChat(`day1-${n}`);
    }
    expect((await redis.admit(lastMs, client(1), "day1-late")).reason).toBe("client_cap");
    // One millisecond later it is another UTC day: new keys, counts from zero.
    expect(await redis.admit(lastMs + 1, client(1), "day2-first")).toMatchObject({
      admitted: true,
      counters: { global: 1, client: 1 },
    });
  } finally {
    await redis.cleanUp();
  }
});

test("expiry is bounded: day counters within 25 h, the lease set within its TTL + 60 s", async () => {
  const redis = isolatedStore();
  try {
    // A real "now" here: TTL is counted by Redis's own clock.
    const now = Date.now();
    await redis.admit(now, client(1), "ttl-check");
    const keys = chatKeys(redis.namespace, now, client(1));
    for (const key of [keys.global, keys.client]) {
      const ttl = Number(await redis.raw("TTL", key));
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(25 * 3_600);
    }
    const leaseSetTtl = Number(await redis.raw("PTTL", keys.inFlight));
    expect(leaseSetTtl).toBeGreaterThan(LEASE_TTL_MS);
    expect(leaseSetTtl).toBeLessThanOrEqual(LEASE_TTL_MS + 60_000);
  } finally {
    await redis.cleanUp();
  }
});

test("status checks have their own limits (15 global, 3 per client), separate from the chat's", async () => {
  const redis = isolatedStore();
  try {
    for (let n = 0; n < STATUS_CLIENT_DAILY_CAP; n++) expect((await redis.admitStatus(NOON, client(1))).admitted).toBe(true);
    expect((await redis.admitStatus(NOON, client(1))).reason).toBe("client_cap");

    for (let n = 2; (await redis.admitStatus(NOON, client(n))).admitted; n++) {
      // keep asking with new clients until the global status cap refuses
    }
    expect(await redis.raw("GET", statusKeys(redis.namespace, NOON, client(1)).global)).toBe(String(STATUS_GLOBAL_DAILY_CAP));
    // The chat's own counters were never touched by status checks.
    expect(await redis.raw("GET", chatKeys(redis.namespace, NOON, client(1)).global)).toBeNull();
  } finally {
    await redis.cleanUp();
  }
});

test("the kill switch reads the real key: only 'true' is on", async () => {
  const redis = isolatedStore();
  const key = killSwitchKey(redis.namespace);
  try {
    expect(await redis.store.isChatEnabled()).toBe(false); // missing key: off
    await redis.raw("SET", key, "true");
    expect(await redis.store.isChatEnabled()).toBe(true);
    await redis.raw("SET", key, "false");
    expect(await redis.store.isChatEnabled()).toBe(false);
  } finally {
    await redis.cleanUp();
  }
});

test("a wrong token is refused by the store, and that fails closed", async () => {
  const store = createUpstashStore({ url, token: "deliberately-wrong-token", namespace: storeNamespace("test-wrongtok") });
  await expect(store.isChatEnabled()).rejects.toThrow("store answered HTTP 401");
});
