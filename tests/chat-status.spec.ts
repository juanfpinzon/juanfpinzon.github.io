import { expect, test } from "@playwright/test";
import type { BffConfig } from "@/lib/chat/bff";
import { HEALTH_TIMEOUT_MS, handleStatusRequest, type StatusLogEntry } from "@/lib/chat/status";
import { fakeStore, refused, type FakeStoreOptions } from "./fake-admission-store";

/*
 * The warm-up check (lib/chat/status.ts) on the REAL handler, with a fake
 * `/health` and a fake store. No browser, no server, no network.
 *
 * The rules under test: nothing goes upstream unless the kill switch is on,
 * the settings are complete, a client address is known and the status
 * check's own limit admits it; then exactly one GET /health, with no
 * credential and nothing from the browser; and a typed, uncached answer.
 */

const CONFIG: BffConfig = {
  apiUrl: "https://procurerag.example.invalid",
  serviceToken: "fake-token-for-unit-tests",
  clientHashSecret: "fake-client-hash-secret-for-unit-tests-only",
};

type HealthCall = { url: string; init: RequestInit };
type Health = (call: HealthCall) => Response | Promise<Response>;

const healthy: Health = () => Response.json({ status: "ok", app: "ProcureRAG API", version: "x", live_llm: true });
/** A `/health` that never answers (a replica still starting): only the BFF's timeout ends it. */
const neverAnswers: Health = ({ init }) =>
  new Promise((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(init.signal?.reason)));

async function status(health?: Health, overrides: { store?: FakeStoreOptions | null; config?: BffConfig | null; clientAddress?: string | null } = {}) {
  const calls: HealthCall[] = [];
  const store = fakeStore(overrides.store ?? {});
  const logs: StatusLogEntry[] = [];
  const response = await handleStatusRequest({
    config: overrides.config === undefined ? CONFIG : overrides.config,
    store: overrides.store === null ? null : store.store,
    clientAddress: overrides.clientAddress === undefined ? "198.51.100.23" : overrides.clientAddress,
    fetchUpstream: async (url, init) => {
      calls.push({ url, init });
      if (health === undefined) throw new Error("the status route called /health, but it should have refused first");
      return health({ url, init });
    },
    timeoutMs: 50, // a "timeout" in 50 ms, not 90 s
    log: (entry) => logs.push(entry),
  });
  const raw = await response.text();
  return { response, raw, state: (JSON.parse(raw) as { state: string }).state, calls, logs, store };
}

test("the BFF waits 90 s for /health: above the measured 59-72 s cold starts, below maxDuration 100 s", () => {
  expect(HEALTH_TIMEOUT_MS).toBe(90_000);
});

test("ready: exactly one GET /health, no credential, no body, and an uncached typed answer", async () => {
  const { response, raw, state, calls, store } = await status(healthy);

  expect([response.status, state]).toEqual([200, "ready"]);
  expect(response.headers.get("cache-control")).toBe("no-store");
  // The browser gets the state and nothing else: not the version, not live_llm.
  expect(JSON.parse(raw)).toEqual({ state: "ready" });

  expect(calls).toHaveLength(1);
  const [{ url, init }] = calls;
  expect(url).toBe(`${CONFIG.apiUrl}/health`);
  expect(init.method).toBe("GET");
  expect(init.body).toBeUndefined();
  expect(new Headers(init.headers).get("authorization")).toBeNull();
  expect(init.redirect).toBe("error");
  expect(store.calls).toEqual(["isChatEnabled", "admitStatus"]);
});

test("waking: /health silent until the timeout -> 504, one call, no retry", async () => {
  const { response, state, calls } = await status(neverAnswers);
  expect([response.status, state]).toEqual([504, "waking"]);
  expect(calls).toHaveLength(1);
});

test("unavailable: /health errors, refused connections and anything that is not {status: ok}", async () => {
  const unhealthy: [string, Health][] = [
    ["500", () => new Response("Internal Server Error", { status: 500 })],
    ["refused", () => Promise.reject(new TypeError("fetch failed"))],
    ["not JSON", () => new Response("<html>gateway</html>", { status: 200 })],
    ["wrong status", () => Response.json({ status: "starting" })],
    ["too large", () => new Response(" ".repeat(10_000), { status: 200 })],
  ];
  for (const [label, health] of unhealthy) {
    const { response, state, calls } = await status(health);
    expect([response.status, state], label).toEqual([503, "unavailable"]);
    expect(calls, label).toHaveLength(1);
  }
});

test("kill switch off, store broken, store or config missing, or no client address: nothing is called", async () => {
  const cases: [string, Parameters<typeof status>[1], string][] = [
    ["kill switch off", { store: { enabled: false } }, "kill_switch"],
    ["store unreadable", { store: { failOn: "isChatEnabled" } }, "store_error"],
    ["admission failed in the store", { store: { failOn: "admitStatus" } }, "store_error"],
    ["no store configured", { store: null }, "missing_store_config"],
    ["no API configured", { config: null }, "missing_config"],
    ["no client address", { clientAddress: null }, "no_client_address"],
  ];
  for (const [label, overrides, reason] of cases) {
    const { response, state, calls, logs } = await status(healthy, overrides);
    expect([response.status, state], label).toEqual([503, "unavailable"]);
    expect(calls, label).toHaveLength(0);
    expect(logs[0].reason, label).toBe(reason);
  }
});

test("busy: the status check's own daily limit is reached -> 429, /health is not called", async () => {
  for (const reason of ["global_cap", "client_cap"] as const) {
    const { response, state, calls, logs } = await status(healthy, { store: { admission: refused(reason) } });
    expect([response.status, state]).toEqual([429, "busy"]);
    expect(calls).toHaveLength(0);
    expect(logs[0].reason).toBe(reason);
  }
});

test("the log line holds numbers and states only: never the address, a secret or the upstream body", async () => {
  const { logs } = await status(healthy);
  expect(logs).toHaveLength(1);
  expect(logs[0]).toMatchObject({ route: "/api/chat/status", state: "ready", http_status: 200, upstream_status: 200 });
  const text = JSON.stringify(logs);
  for (const forbidden of ["198.51.100.23", CONFIG.clientHashSecret, CONFIG.serviceToken, CONFIG.apiUrl, "live_llm"]) {
    expect(text).not.toContain(forbidden);
  }
});
