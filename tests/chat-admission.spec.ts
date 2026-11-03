import { expect, test } from "@playwright/test";
import {
  CHAT_CLIENT_DAILY_CAP,
  CHAT_GLOBAL_DAILY_CAP,
  CHAT_IN_FLIGHT_CAP,
  COUNTER_GRACE_SECONDS,
  LEASE_TTL_MS,
  chatKeys,
  clientDigest,
  counterTtlSeconds,
  inFlightKey,
  isValidBudgetDomain,
  killSwitchKey,
  secondsUntilUtcMidnight,
  statusKeys,
  storeNamespace,
  trustedClientAddress,
  utcDay,
} from "@/lib/chat/admission";
import {
  CHAT_ADMISSION_SCRIPT,
  STATUS_ADMISSION_SCRIPT,
  StoreError,
  createUpstashStore,
  parseAdmissionReply,
  sendCommand,
  type UpstashSettings,
} from "@/lib/chat/upstash-admission";

/*
 * Admission, WITHOUT a real store: key names, the UTC day, client hashing,
 * and exactly what the Upstash store sends and how it reads replies.
 *
 * These are deterministic and need no network. They do NOT prove the Lua
 * scripts count correctly or atomically: a fake `fetch` only sees the script
 * as text. That proof is tests/chat-admission-redis.spec.ts, against a real
 * Redis.
 */

const NAMESPACE = storeNamespace("unit-test");
const DIGEST = "a".repeat(64);
const SECRET = "unit-test-client-hash-secret-0123456789";
/** 2026-10-28 23:59:59.999 UTC: the last millisecond of a day. */
const LAST_MS = Date.UTC(2026, 9, 28, 23, 59, 59, 999);

test.describe("the UTC day", () => {
  test("the last millisecond of a day and the first of the next are different days", () => {
    expect(utcDay(LAST_MS)).toBe("2026-10-28");
    expect(utcDay(LAST_MS + 1)).toBe("2026-10-29");
  });

  test("the daily counters move to new keys at 00:00 UTC; the lease set does not", () => {
    const before = chatKeys(NAMESPACE, LAST_MS, DIGEST);
    const after = chatKeys(NAMESPACE, LAST_MS + 1, DIGEST);
    expect(before.global).not.toBe(after.global);
    expect(before.client).not.toBe(after.client);
    expect(before.inFlight).toBe(after.inFlight);
    expect(before.inFlight).toBe(inFlightKey(NAMESPACE));
  });

  test("the reset countdown is at least 1 s and at most one day", () => {
    expect(secondsUntilUtcMidnight(LAST_MS)).toBe(1);
    expect(secondsUntilUtcMidnight(LAST_MS + 1)).toBe(86_400); // exactly 00:00:00.000
    expect(secondsUntilUtcMidnight(Date.UTC(2026, 9, 28, 23, 0, 0))).toBe(3_600);
  });

  test("a counter key always expires after its day ends, and within 25 hours", () => {
    for (const nowMs of [LAST_MS, LAST_MS + 1, Date.UTC(2026, 9, 28, 12, 0, 0)]) {
      const ttl = counterTtlSeconds(nowMs);
      expect(ttl).toBeGreaterThan(secondsUntilUtcMidnight(nowMs));
      expect(ttl).toBeLessThanOrEqual(86_400 + COUNTER_GRACE_SECONDS);
    }
  });
});

test.describe("key names and the budget domain", () => {
  test("every key starts with the namespace; the kill switch is shared by the whole domain", () => {
    const keys = [...Object.values(chatKeys(NAMESPACE, LAST_MS, DIGEST)), ...Object.values(statusKeys(NAMESPACE, LAST_MS, DIGEST))];
    for (const key of keys) expect(key.startsWith(`${NAMESPACE}:`)).toBe(true);
    expect(killSwitchKey(NAMESPACE)).toBe("procurerag-demo:unit-test:chat:enabled");
    // The chat and the status checks never share a counter.
    expect(chatKeys(NAMESPACE, LAST_MS, DIGEST).global).not.toBe(statusKeys(NAMESPACE, LAST_MS, DIGEST).global);
  });

  test("a budget domain is short and made of a-z, 0-9 and '-'", () => {
    for (const ok of ["or-demo-2026-10", "playwright", "test-1a2b3c4d"]) expect(isValidBudgetDomain(ok), ok).toBe(true);
    for (const bad of ["", "-starts-with-dash", "Upper", "has:colon", "has space", "x".repeat(41)]) {
      expect(isValidBudgetDomain(bad), bad).toBe(false);
    }
  });
});

test.describe("the client: a platform-set address, stored only as an HMAC digest", () => {
  const headers = (value?: string) => new Headers(value === undefined ? {} : { "x-vercel-forwarded-for": value });

  test("exactly one valid IPv4 or IPv6 address is accepted (IPv6 in lower case)", () => {
    expect(trustedClientAddress(headers("203.0.113.7"))).toBe("203.0.113.7");
    expect(trustedClientAddress(headers(" 203.0.113.7 "))).toBe("203.0.113.7");
    expect(trustedClientAddress(headers("2001:DB8::1"))).toBe("2001:db8::1");
  });

  test("missing, blank, a list or not an address: null, and the request will be refused", () => {
    for (const value of [undefined, "", "   ", "203.0.113.7, 198.51.100.1", "203.0.113.7:443", "unknown", "999.1.1.1"]) {
      expect(trustedClientAddress(headers(value)), String(value)).toBeNull();
    }
  });

  test("only the trusted header counts: a browser's own x-forwarded-for or x-real-ip is ignored", () => {
    const spoofed = new Headers({ "x-forwarded-for": "203.0.113.7", "x-real-ip": "203.0.113.7" });
    expect(trustedClientAddress(spoofed)).toBeNull();
  });

  test("the digest is a 64-character HMAC: stable, secret-dependent, and the address is not in it", () => {
    const digest = clientDigest("203.0.113.7", SECRET);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(clientDigest("203.0.113.7", SECRET)).toBe(digest);
    expect(clientDigest("203.0.113.8", SECRET)).not.toBe(digest);
    // Another secret (a rotation): another digest. Without the secret it cannot be recomputed.
    expect(clientDigest("203.0.113.7", `${SECRET}-rotated`)).not.toBe(digest);
    // No key name holds the raw address, only the digest.
    for (const key of Object.values(chatKeys(NAMESPACE, LAST_MS, digest))) expect(key).not.toContain("203.0.113.7");
  });
});

test.describe("the Lua scripts, read as text", () => {
  /** Position of the first match, or Infinity if absent. */
  const at = (script: string, pattern: RegExp) => script.search(pattern) === -1 ? Infinity : script.search(pattern);

  test("every refusal returns BEFORE the first write, so a refusal changes nothing", () => {
    for (const script of [CHAT_ADMISSION_SCRIPT, STATUS_ADMISSION_SCRIPT]) {
      const lastRefusal = script.lastIndexOf("return {0");
      const firstWrite = Math.min(at(script, /'ZADD'/), at(script, /'INCR'/), at(script, /'EXPIRE'/), at(script, /'PEXPIRE'/));
      expect(lastRefusal).toBeGreaterThan(-1);
      expect(lastRefusal).toBeLessThan(firstWrite);
    }
  });

  test("time comes only from ARGV: the scripts never ask Redis for its clock", () => {
    for (const script of [CHAT_ADMISSION_SCRIPT, STATUS_ADMISSION_SCRIPT]) expect(script).not.toMatch(/'TIME'/i);
  });
});

test.describe("the Upstash store: one POST per command, and replies checked", () => {
  type Sent = { url: string; init: RequestInit; command: string[] };

  /** A fake `fetch` that records each command and answers `respond(command)`. */
  function fakeUpstash(respond: (command: string[]) => Response | Promise<Response>) {
    const sent: Sent[] = [];
    const settings: UpstashSettings = {
      url: "https://store.example.invalid",
      token: "fake-store-token-for-unit-tests",
      namespace: NAMESPACE,
      fetch: async (url, init) => {
        const command = JSON.parse(String(init.body)) as string[];
        sent.push({ url, init, command });
        return respond(command);
      },
    };
    return { sent, settings, store: createUpstashStore(settings) };
  }
  const result = (value: unknown) => () => Response.json({ result: value });

  test("admitChat: one EVAL with 3 declared KEYS, then now, lease, TTL and the three caps as ARGV", async () => {
    const { sent, store } = fakeUpstash(result([1, "admitted", 7, 2, 1]));
    const admission = await store.admitChat({ nowMs: LAST_MS, clientDigest: DIGEST, leaseId: "lease-1" });

    expect(admission).toEqual({ admitted: true, reason: "admitted", counters: { global: 7, client: 2, in_flight: 1 } });
    expect(sent).toHaveLength(1);
    const [{ url, init, command }] = sent;
    const keys = chatKeys(NAMESPACE, LAST_MS, DIGEST);
    expect(url).toBe("https://store.example.invalid");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer fake-store-token-for-unit-tests");
    expect(init.redirect).toBe("error");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(command).toEqual([
      "EVAL",
      CHAT_ADMISSION_SCRIPT,
      "3",
      keys.inFlight,
      keys.global,
      keys.client,
      String(LAST_MS),
      "lease-1",
      String(LEASE_TTL_MS),
      String(CHAT_GLOBAL_DAILY_CAP),
      String(CHAT_CLIENT_DAILY_CAP),
      String(CHAT_IN_FLIGHT_CAP),
      String(counterTtlSeconds(LAST_MS)),
    ]);
  });

  test("releaseChat is one ZREM of this lease id; 0 (already gone) is as fine as 1", async () => {
    for (const removed of [1, 0]) {
      const { sent, store } = fakeUpstash(result(removed));
      await store.releaseChat("lease-1");
      expect(sent.map((call) => call.command)).toEqual([["ZREM", inFlightKey(NAMESPACE), "lease-1"]]);
    }
  });

  test("the kill switch is on ONLY for the exact string 'true'", async () => {
    for (const [value, enabled] of [["true", true], ["false", false], [null, false], ["1", false], ["TRUE", false], ["true ", false]] as const) {
      const { store } = fakeUpstash(result(value));
      expect(await store.isChatEnabled(), String(value)).toBe(enabled);
    }
    const { store } = fakeUpstash(result(1));
    await expect(store.isChatEnabled()).rejects.toThrow(StoreError);
  });

  test("every way the store can fail throws a StoreError whose message holds no secret", async () => {
    const failures: [string, () => Response | Promise<Response>][] = [
      ["wrong token", () => Response.json({ error: "WRONGPASS invalid password" }, { status: 401 })],
      ["Lua error", () => Response.json({ error: "ERR Error running script" }, { status: 400 })],
      ["no result field", () => Response.json({ ok: true })],
      ["not JSON", () => new Response("<html>gateway</html>", { status: 200 })],
      ["unreachable", () => Promise.reject(new TypeError("fetch failed"))],
    ];
    for (const [label, respond] of failures) {
      const { settings, store } = fakeUpstash(respond);
      const error = await store.admitChat({ nowMs: LAST_MS, clientDigest: DIGEST, leaseId: "lease-1" }).catch((e) => e);
      expect(error, label).toBeInstanceOf(StoreError);
      for (const secret of [settings.token, settings.url, DIGEST, "WRONGPASS"]) {
        expect((error as Error).message, label).not.toContain(secret);
      }
    }
  });

  test("a store slower than its timeout is a StoreError (and the request will fail closed)", async () => {
    const settings: UpstashSettings = {
      url: "https://store.example.invalid",
      token: "t",
      namespace: NAMESPACE,
      timeoutMs: 20,
      fetch: (_url, init) =>
        new Promise((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(init.signal?.reason))),
    };
    await expect(sendCommand(settings, ["GET", "x"])).rejects.toThrow("store timed out");
  });

  test("an admission reply must be exactly [0|1, reason, global, client, in_flight]", () => {
    expect(parseAdmissionReply([0, "client_cap", 30, 10, 1]).reason).toBe("client_cap");
    const malformed: unknown[] = [
      null,
      "OK",
      [1, "admitted", 1, 1], // too short
      [2, "admitted", 1, 1, 1], // flag not 0/1
      [1, "global_cap", 1, 1, 1], // flag says admitted, reason says refused
      [0, "admitted", 1, 1, 1], // the other way round
      [1, "maybe", 1, 1, 1], // unknown reason
      [1, "admitted", -1, 1, 1], // negative count
      [1, "admitted", "7", 1, 1], // a count as a string
      [1, "admitted", 1.5, 1, 1], // not a whole number
    ];
    for (const reply of malformed) expect(() => parseAdmissionReply(reply), JSON.stringify(reply)).toThrow(StoreError);
  });
});
