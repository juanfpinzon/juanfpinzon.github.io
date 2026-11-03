import type { Admission, AdmissionStore } from "@/lib/chat/admission";
import { StoreError } from "@/lib/chat/upstash-admission";

/*
 * A fake `AdmissionStore` for the HANDLER tests (chat-bff, chat-status).
 *
 * It does not count anything: each method answers what the test chose and
 * records that it was called. That is exactly what the handler tests need:
 * "was admission even attempted?", "was the lease released, and which one?",
 * "did anything try to refund?". Whether the real counting is right is a
 * different question, answered against a real Redis in
 * tests/chat-admission-redis.spec.ts.
 */

export const ADMITTED: Admission = {
  admitted: true,
  reason: "admitted",
  counters: { global: 7, client: 2, in_flight: 1 },
};

export function refused(reason: "global_cap" | "client_cap" | "in_flight_cap"): Admission {
  return { admitted: false, reason, counters: { global: 54, client: 10, in_flight: 2 } };
}

type Method = keyof AdmissionStore;

export type FakeStoreOptions = {
  /** The kill switch. Default true (chat on). */
  enabled?: boolean;
  /** What both admission methods answer. Default `ADMITTED`. */
  admission?: Admission;
  /** This method throws a `StoreError`, as the real store does when it cannot answer. */
  failOn?: Method;
};

export function fakeStore(options: FakeStoreOptions = {}) {
  /** Every method called, in order. */
  const calls: Method[] = [];
  /** The arguments of each admission. */
  const admitInputs: { nowMs: number; clientDigest: string; leaseId?: string }[] = [];
  /** The lease ids given back. */
  const released: string[] = [];

  function enter(method: Method) {
    calls.push(method);
    if (options.failOn === method) throw new StoreError("store unreachable");
  }

  const store: AdmissionStore = {
    async isChatEnabled() {
      enter("isChatEnabled");
      return options.enabled ?? true;
    },
    async admitChat(input) {
      admitInputs.push(input);
      enter("admitChat");
      return options.admission ?? ADMITTED;
    },
    async releaseChat(leaseId) {
      enter("releaseChat");
      released.push(leaseId);
    },
    async admitStatus(input) {
      admitInputs.push(input);
      enter("admitStatus");
      return options.admission ?? ADMITTED;
    },
  };
  return { store, calls, admitInputs, released };
}
