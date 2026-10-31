/*
 * The public chat contract: what the browser and the BFF agree on.
 *
 *   browser  --{"question": "..."}-->  BFF (app/api/chat/route.ts)  -->  ProcureRAG API
 *   browser  <------- BrowserView ----  BFF  <------- QueryResponse ---  ProcureRAG API
 *
 * This is a NEUTRAL module: no secret, no environment variable, no server-only
 * code. Both sides import it: the chat Client Component (which ships to every
 * visitor's browser) and the server-side BFF. So the two can never disagree on
 * a limit, a state name or a message, and nothing in here may ever be secret.
 *
 * The specification is ProcureRAG's `scripts/portfolio_contract_probe.py`
 * (Day 26). This file and `lib/chat/bff.ts` are its TypeScript port.
 */

import { presets } from "@/content/procurerag";

/** Longest question, in characters. The same cap as the API (`api.MAX_QUERY_CHARS`). */
export const MAX_QUESTION_CHARS = 500;

/**
 * Largest request body the BFF accepts, in BYTES, checked before parsing.
 * 500 characters are at most 2,000 bytes of UTF-8 (4 bytes per character at
 * most), plus 15 bytes for `{"question":""}`, so a valid question always fits.
 */
export const MAX_BODY_BYTES = 2048;

/** The six statuses the ProcureRAG API can return (`api.ApiStatus`). */
export const API_STATES = [
  "answered",
  "model_declined",
  "gap_report",
  "not_generated",
  "blocked",
  "pending_approval",
] as const;

/** The four outcomes where no API response exists: the request never got a usable answer. */
export const TRANSPORT_STATES = ["invalid_question", "busy", "timed_out", "unavailable"] as const;

export type ApiState = (typeof API_STATES)[number];
export type TransportState = (typeof TRANSPORT_STATES)[number];
export type UiState = ApiState | TransportState;

/** Every UI state, for code that must check "is this one of ours?" at runtime. */
export const UI_STATES: readonly UiState[] = [...API_STATES, ...TRANSPORT_STATES];

/** One source as the browser sees it: IDs and a cited flag. No snippet, no URL, no title. */
export type PublicSource = {
  source_id: number;
  doc_id: string;
  chunk_id: string;
  cited: boolean;
};

/**
 * What the BFF returns to the browser. Deliberately SMALLER than the API's
 * `QueryResponse`: no `run_id`, no `approval_request`, no guard `detail` text.
 */
export type BrowserView = {
  state: UiState;
  /** Fixed UI copy for this state, written by the BFF, never by the API. */
  message: string;
  /** The API's own user-safe text, only where it is meant for a public visitor. */
  text: string | null;
  sources: PublicSource[];
  caveats: string[];
  /** Names of the guards that fired, e.g. ["prompt_injection"]. Names only, never details. */
  guards: string[];
  /** Only with `busy`, and only when the upstream sent a whole number of seconds. */
  retry_after_seconds: number | null;
};

/** The fixed message for each state (the probe's `UI_MESSAGES`, word for word). */
export const UI_MESSAGES: Record<UiState, string> = {
  // the six API statuses
  answered:
    "Answer generated from the cited synthetic sources. Citation checks passed; correctness is not guaranteed.",
  model_declined: "The model read the sources and said they do not answer this question.",
  gap_report: "Not answered: required evidence is missing, so no answer was built from partial evidence.",
  not_generated: "Retrieval-only mode: these are the sources an answer would use. No model was called.",
  blocked: "Refused by a guardrail before anything ran.",
  pending_approval:
    "This question needs a reviewer-approved second search, which the public demo does not offer.",
  // the four transport outcomes
  invalid_question: "Please send a procurement question of 1-500 characters.",
  busy: "The demo has reached its request limit. Please try again later.",
  timed_out:
    "The service took too long to answer (it may have been starting up). Please try again in a minute.",
  unavailable: "The live demo is unavailable right now. The case study and code are still available.",
};

// ---------------------------------------------------------------------------
// The warm-up check: GET /api/chat/status (ADR §8.4, "warm on intent").
// ---------------------------------------------------------------------------

/**
 * What the status route says about the ProcureRAG service. The Azure app scales
 * to zero when idle, and waking it takes about a minute. So when a visitor
 * scrolls to the chat, the browser asks once, and the BFF calls the API's free
 * `/health` (never `/query`, never the LLM):
 *
 * - `ready`: `/health` answered "ok". The next question will not wait for a cold start;
 * - `waking`: `/health` did not answer within the BFF's 90 s. The service may
 *   still be starting, so the first question may take longer or time out;
 * - `busy`: the status check's OWN daily limit is used up, so `/health` was not
 *   called (the same rule as the chat: `busy` always means an enforced limit);
 * - `unavailable`: kill switch off, configuration or quota store missing or
 *   broken, or `/health` failed.
 */
export const SERVICE_STATES = ["ready", "waking", "busy", "unavailable"] as const;
export type ServiceState = (typeof SERVICE_STATES)[number];

/** The status route's whole reply body. Nothing from `/health` is passed on. */
export type StatusView = { state: ServiceState };

/**
 * The warm-up line above the chat. `checking` is the browser's own state while
 * the one status request is on its way; the other four are the route's replies.
 */
export const SERVICE_MESSAGES: Record<ServiceState | "checking", string> = {
  checking: "Checking the live service. If it was idle, waking it takes about a minute.",
  ready: "The live service is awake.",
  waking: "The live service is still starting. Your first question may take longer, or time out.",
  busy: "The warm-up check has reached its daily limit. If the service is idle, your first question can take about a minute.",
  unavailable: UI_MESSAGES.unavailable,
};

/** A `BrowserView` for an outcome where no API response exists (or none may be shown). */
export function transportView(state: TransportState, retryAfterSeconds: number | null = null): BrowserView {
  return {
    state,
    message: UI_MESSAGES[state],
    text: null,
    sources: [],
    caveats: [],
    guards: [],
    retry_after_seconds: retryAfterSeconds,
  };
}

/**
 * The number of characters in `text`, counted the way the API counts them.
 *
 * JavaScript's `text.length` counts UTF-16 code units, so an emoji such as
 * "😀" has length 2. Python (and so the API's 500-character cap) counts code
 * points, where the same emoji is 1. `Array.from(text)` splits a string into
 * code points, so its length matches Python's `len(text)`. Using `.length`
 * here would refuse a valid 300-emoji question that the API would accept.
 */
export function countCharacters(text: string): number {
  return Array.from(text).length;
}

/** Exact preset text -> its labeled id (Q001, Q005, Q021, Q090; content/procurerag.ts). */
const PRESET_ID_BY_TEXT = new Map<string, string>(presets.map((preset) => [preset.text, preset.id]));

/**
 * The preset id for a question that IS a preset, character for character;
 * null for anything else (free text). `Map.get` compares strings exactly, so
 * one extra space or a changed number makes it free text.
 *
 * The BFF uses this to decide whether a `query_id` goes upstream; the chat
 * uses it to tell the visitor which of the two their text is.
 */
export function presetIdFor(question: string): string | null {
  return PRESET_ID_BY_TEXT.get(question) ?? null;
}
