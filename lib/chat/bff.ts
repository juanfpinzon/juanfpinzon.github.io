/*
 * The BFF ("backend for frontend") behind POST /api/chat.
 *
 * The browser never talks to ProcureRAG directly. It talks to this code, on
 * the portfolio's own origin, and this code talks to the ProcureRAG API with a
 * service credential the browser never sees:
 *
 *   browser ──{"question"}──▶ BFF ──QueryRequest + Bearer token──▶ ProcureRAG API
 *   browser ◀──BrowserView─── BFF ◀──────────QueryResponse─────── ProcureRAG API
 *
 * WHO DECIDES WHAT:
 * - the BROWSER decides only the question text. Any other key is refused here,
 *   before anything is sent upstream;
 * - the BFF decides the role (always "requester") and whether a `query_id` is
 *   attached (only for an exact preset text). It never sends a decision;
 * - the API decides everything else: guards, role filter, retrieval, status.
 *
 * WHY THIS FILE READS NO ENVIRONMENT VARIABLE: everything from the outside
 * world (the API URL and token, `fetch`, the clock for timeouts, the logger,
 * the kill switch) arrives through `BffDeps`. The route file
 * (app/api/chat/route.ts) passes the real ones. The tests pass fakes, so they
 * can count upstream calls, simulate a timeout or a cut-off reply, and never
 * touch the network. The secret itself only ever lives in the route's
 * environment and in the `config` object passed in per request.
 *
 * The specification is ProcureRAG's `scripts/portfolio_contract_probe.py`;
 * `handleChatRequest` below follows its `handle_browser_request` step by step.
 */

import {
  API_STATES,
  MAX_BODY_BYTES,
  MAX_QUESTION_CHARS,
  UI_MESSAGES,
  countCharacters,
  presetIdFor,
  transportView,
  type ApiState,
  type BrowserView,
  type PublicSource,
  type UiState,
} from "./contract";

// ---------------------------------------------------------------------------
// The public demo policy. Nothing here comes from the browser.
// ---------------------------------------------------------------------------

/**
 * The role every public request runs as. "requester" is the least-privileged
 * role the API knows: it sees the 24 Internal documents and none of the 10
 * Confidential ones. A visitor is anonymous, so the BFF cannot know who they
 * are, and must not take their word for it.
 */
export const PUBLIC_ROLE = "requester";

/**
 * How long the BFF waits for the API: the provider's own 60 s timeout, plus
 * retrieval, plus a margin (ADR §8.4). The route's `maxDuration` (100 s) is
 * longer, so this typed timeout fires first and the visitor gets `timed_out`
 * instead of a platform error page.
 */
export const UPSTREAM_TIMEOUT_MS = 75_000;

// ---------------------------------------------------------------------------
// The outside world, injected.
// ---------------------------------------------------------------------------

/** The two server-only settings. `null` when either is missing or unusable. */
export type BffConfig = {
  /** Base URL of the ProcureRAG API, without a trailing slash. */
  apiUrl: string;
  /** The service token, sent as `Authorization: Bearer <serviceToken>`. */
  serviceToken: string;
};

/** One structured log line per request. It never holds the question, an answer, a body or a secret. */
export type ChatLogEntry = {
  at: string;
  route: "/api/chat";
  state: UiState;
  http_status: number;
  latency_ms: number;
  /** A preset id such as "Q001", "free_text", or "none" when the body was refused before parsing. */
  question_kind: string;
  /** Why a request ended early, when the state alone does not say it. */
  reason?: string;
  upstream_status?: number;
  /** For a malformed upstream reply: WHERE it was wrong, never what it said. */
  validation_error?: string;
};

export type BffDeps = {
  config: BffConfig | null;
  /** The kill switch: false answers `unavailable` at once and calls nothing. */
  demoEnabled: boolean;
  /** How the BFF reaches the API. The real `fetch` in the route, a fake in tests. */
  fetchUpstream: (url: string, init: RequestInit) => Promise<Response>;
  /** Override for tests only, so a "timeout" takes milliseconds instead of 75 s. */
  timeoutMs?: number;
  log?: (entry: ChatLogEntry) => void;
};

// ---------------------------------------------------------------------------
// Hop 1: what the browser may send.
// ---------------------------------------------------------------------------

type BodyRead = { kind: "ok"; bytes: Uint8Array } | { kind: "too_large" };

/**
 * Read the raw request body, refusing it once it is larger than `maxBytes`.
 *
 * Why not `await request.json()`: that reads the WHOLE body into memory
 * first, however large it is, and only then parses it. A 500-character
 * question padded with 5 MB of JSON whitespace is valid JSON, and every check
 * after parsing would accept it. So the size is checked first, on raw bytes.
 *
 * Two checks, because neither one is enough alone:
 * 1. a declared `Content-Length` above the cap: refused without reading a
 *    single byte;
 * 2. the body itself, counted chunk by chunk WHILE it streams in. A request
 *    sent with `Transfer-Encoding: chunked` has no `Content-Length` at all,
 *    and a lying header could claim a small size. As soon as the running
 *    total passes `maxBytes`, the reader is cancelled: no further chunk is
 *    ever requested.
 *
 * The runtime decides how big each chunk is, so the chunk that crosses the
 * limit is already in memory when it is counted. What this guarantees: reading
 * stops at the first chunk past the cap (with 1-byte chunks, after exactly
 * 2,049 bytes), and at most `maxBytes` bytes are kept.
 */
export async function readBodyWithLimit(request: Request, maxBytes = MAX_BODY_BYTES): Promise<BodyRead> {
  const declared = request.headers.get("content-length");
  // `Number("abc")` is NaN, and `NaN > maxBytes` is false: a garbage header
  // falls through to check 2, which still enforces the cap.
  if (declared !== null && Number(declared) > maxBytes) {
    return { kind: "too_large" };
  }

  if (request.body === null) {
    return { kind: "ok", bytes: new Uint8Array(0) };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      // Tell the stream we are done with it: nothing more is read.
      await reader.cancel();
      return { kind: "too_large" };
    }
    chunks.push(value);
  }

  // Join the chunks into one byte array.
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { kind: "ok", bytes };
}

/**
 * The question, if `bytes` is exactly `{"question": "<1-500 characters>"}`. Otherwise null.
 *
 * Each check below is a way a body can be wrong, and every one of them ends
 * the same way (422 `invalid_question`, nothing sent upstream):
 * - not UTF-8 (`fatal: true` makes the decoder throw instead of inventing "�");
 * - not JSON at all, e.g. cut off mid-transfer;
 * - JSON, but not an object: an array, a string, a number, `null`;
 * - any key other than `question`, or no `question`. Escalation is REFUSED,
 *   not silently dropped: a visitor who adds `"role": "buyer"` gets a 422, so
 *   the attempt is visible instead of hidden;
 * - `question` not a string, blank (only whitespace), or over 500 characters.
 */
export function parseBrowserQuestion(bytes: Uint8Array): string | null {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const keys = Object.keys(value);
  if (keys.length !== 1 || keys[0] !== "question") return null;

  const question = (value as { question: unknown }).question;
  if (typeof question !== "string") return null;
  if (question.trim().length === 0) return null;
  if (countCharacters(question) > MAX_QUESTION_CHARS) return null;
  return question;
}

/**
 * Whether the request says its body is JSON.
 *
 * The chat always sends `Content-Type: application/json`. A browser on
 * ANOTHER site can only send a cross-origin POST without asking first if its
 * content type is a "simple" one (form data or `text/plain`). Requiring JSON
 * means such a request needs a CORS preflight, which this route never
 * approves, so another site cannot make its visitors' browsers spend this
 * demo's budget.
 */
function declaresJson(request: Request): boolean {
  const contentType = request.headers.get("content-type") ?? "";
  return contentType.split(";")[0].trim().toLowerCase() === "application/json";
}

// ---------------------------------------------------------------------------
// Hop 2: what the BFF sends to the API.
// ---------------------------------------------------------------------------

export type UpstreamRequest = {
  query: string;
  role: typeof PUBLIC_ROLE;
  query_id?: string;
};

/**
 * The body sent to `POST {PROCURERAG_API_URL}/query`.
 *
 * - `role` is always "requester".
 * - `query_id` only when the question IS a preset, character for character.
 *   One extra space, a changed number, a paraphrase: all are free text. A gold
 *   label describes one exact question, so attaching it to different text
 *   would let the API measure the evidence against the wrong question
 *   (`presetIdFor` compares exactly).
 * - there is never a `decision`: a public visitor cannot approve anything.
 */
export function buildUpstreamRequest(question: string): UpstreamRequest {
  const body: UpstreamRequest = { query: question, role: PUBLIC_ROLE };
  const queryId = presetIdFor(question);
  if (queryId !== null) body.query_id = queryId;
  return body;
}

// ---------------------------------------------------------------------------
// Hop 3: what comes back. Validate it at runtime, then reduce it.
// ---------------------------------------------------------------------------

/** The API's response contract (`api.QueryResponse`), as this BFF knows it. */
type QueryResponse = {
  status: ApiState;
  query_id: string | null;
  text: string;
  sources: PublicSource[];
  findings: { guard: string; layer: string; action: string; detail: string }[];
  approval_request: Record<string, unknown> | null;
  run_id: string | null;
  caveats: string[];
};

export type Validation = { ok: true; response: QueryResponse } | { ok: false; error: string };

// The closed vocabularies of the API's contract (src/agent_guardrails.py and src/api.py).
const GUARD_NAMES = [
  "prompt_injection",
  "pii",
  "excessive_agency",
  "uncited_answer",
  "ignored_recovered_evidence",
  "off_topic",
];
const GUARD_LAYERS = ["input", "retrieved_context", "action", "output"];
const GUARD_ACTIONS = ["block", "redact", "flag", "route_to_hitl"];
const REVIEWER_DECISIONS = ["approve", "edit", "reject"];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Check = (value: unknown) => boolean;
const isString: Check = (value) => typeof value === "string";
const isNullableString: Check = (value) => value === null || typeof value === "string";
const oneOf =
  (allowed: readonly string[]): Check =>
  (value) =>
    typeof value === "string" && allowed.includes(value);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Check that `value` is an object with EXACTLY these keys, each passing its
 * check. Returns the first problem as "<path>: <what is wrong>", or null.
 *
 * Exactly, like the API's own models (`extra="forbid"`): a key this BFF does
 * not know means an API version it was not written for, so it refuses
 * instead of guessing. The error names the place, never the value: a value
 * could be the question or the answer, and errors are logged.
 */
function checkObject(value: unknown, path: string, shape: Record<string, Check>): string | null {
  if (!isPlainObject(value)) return `${path}: not an object`;
  for (const key of Object.keys(value)) {
    if (!(key in shape)) return `${path}.${key}: unexpected key`;
  }
  for (const [key, check] of Object.entries(shape)) {
    if (!(key in value)) return `${path}.${key}: missing`;
    if (!check(value[key])) return `${path}.${key}: wrong type or value`;
  }
  return null;
}

/** The same check for every item of a list. */
function checkList(value: unknown, path: string, checkItem: (item: unknown, path: string) => string | null) {
  if (!Array.isArray(value)) return `${path}: not a list`;
  for (const [index, item] of value.entries()) {
    const problem = checkItem(item, `${path}[${index}]`);
    if (problem !== null) return problem;
  }
  return null;
}

const checkSource = (item: unknown, path: string) =>
  checkObject(item, path, {
    source_id: (value) => Number.isInteger(value),
    doc_id: isString,
    chunk_id: isString,
    cited: (value) => typeof value === "boolean",
  });

const checkFinding = (item: unknown, path: string) =>
  checkObject(item, path, {
    guard: oneOf(GUARD_NAMES),
    layer: oneOf(GUARD_LAYERS),
    action: oneOf(GUARD_ACTIONS),
    detail: isString,
  });

const checkApprovalRequest = (item: unknown, path: string) =>
  checkObject(item, path, {
    query_id: isString,
    query: isString,
    proposed_action: (value) => value === "recursive_retrieve",
    proposed_followup_query: isString,
    allowed_decisions: (value) => Array.isArray(value) && value.every(oneOf(REVIEWER_DECISIONS)),
    note: isString,
  });

/**
 * Runtime validation of the upstream reply: is `value` a complete `QueryResponse`?
 *
 * Why this exists when `QueryResponse` above is already a TypeScript type: a
 * type is erased when TypeScript compiles to JavaScript. It describes what we
 * HOPE arrives, and checks nothing at run time. `JSON.parse` returns whatever
 * the network delivered: a body cut off by a proxy, an HTML error page, a
 * different API version. Only code that inspects the value can tell. Nothing
 * from the upstream reaches the browser until this function says yes.
 */
export function validateQueryResponse(value: unknown): Validation {
  const problem = checkObject(value, "response", {
    status: oneOf(API_STATES),
    query_id: isNullableString,
    text: isString,
    sources: (sources) => Array.isArray(sources),
    findings: (findings) => Array.isArray(findings),
    approval_request: (request) => request === null || isPlainObject(request),
    run_id: (runId) => runId === null || (typeof runId === "string" && UUID_PATTERN.test(runId)),
    caveats: (caveats) => Array.isArray(caveats) && caveats.every(isString),
  });
  if (problem !== null) return { ok: false, error: problem };

  // The top-level types are right; now the items inside the lists.
  const response = value as QueryResponse;
  const itemProblem =
    checkList(response.sources, "response.sources", checkSource) ??
    checkList(response.findings, "response.findings", checkFinding) ??
    (response.approval_request === null
      ? null
      : checkApprovalRequest(response.approval_request, "response.approval_request"));
  if (itemProblem !== null) return { ok: false, error: itemProblem };

  // The API's own rule (`QueryResponse._approval_request_only_when_pending`):
  // an approval request comes with `pending_approval`, and only with it.
  if ((response.status === "pending_approval") !== (response.approval_request !== null)) {
    return { ok: false, error: "response.approval_request: does not match the status" };
  }
  return { ok: true, response };
}

/**
 * For these two statuses the API's `text` is not shown to a public visitor:
 * - `pending_approval`: the API's text says "send the same request again with
 *   a decision". A public visitor cannot, so it would mislead;
 * - `not_generated`: the API's text explains that no LLM client was built,
 *   which is operator detail. The fixed message says it plainly.
 */
const HIDDEN_API_TEXT: ReadonlySet<ApiState> = new Set(["pending_approval", "not_generated"]);

/**
 * Reduce a VALIDATED response to what the browser may see.
 *
 * Every field is copied by name, so a field this function does not name can
 * never reach the browser, whatever the upstream sent. Dropped on purpose:
 * - `run_id`: the trace row is not stored anywhere, so a trace link would lead
 *   nowhere, and raw traces may hold sensitive text;
 * - `approval_request`: there is no public approval path;
 * - each finding's `detail`: written for an operator. The guard NAME is
 *   enough to explain a refusal.
 */
export function toBrowserView(response: QueryResponse): BrowserView {
  return {
    state: response.status,
    message: UI_MESSAGES[response.status],
    text: HIDDEN_API_TEXT.has(response.status) ? null : response.text,
    sources: response.sources.map(({ source_id, doc_id, chunk_id, cited }) => ({
      source_id,
      doc_id,
      chunk_id,
      cited,
    })),
    caveats: [...response.caveats],
    guards: response.findings.map((finding) => finding.guard),
    retry_after_seconds: null,
  };
}

/**
 * The upstream `Retry-After` header as whole seconds, or null.
 *
 * HTTP allows a delay ("30") or a date ("Wed, 21 Oct 2026 07:28:00 GMT").
 * The API sends seconds, but the BFF must not crash on anything else: a
 * missing header, a date, a negative number or garbage all become null, and
 * the visitor sees the plain "busy" message without a countdown.
 */
export function parseRetryAfter(header: string | null): number | null {
  if (header === null) return null;
  const trimmed = header.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}

/** True for the error `fetch` throws when an `AbortSignal.timeout(...)` fires (a DOMException named "TimeoutError"). */
function isTimeout(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { name?: unknown }).name === "TimeoutError";
}

// ---------------------------------------------------------------------------
// The handler: the three hops above, in order.
// ---------------------------------------------------------------------------

/**
 * One browser request in, one `Response` (a JSON `BrowserView`) out.
 *
 * Each step can end the request, and each runs before the more expensive
 * steps after it:
 *
 *   kill switch off?                 -> 503 unavailable, nothing read or sent
 *   configuration missing?           -> 503 unavailable, nothing read or sent
 *   not declared as JSON?            -> 422 invalid_question
 *   body over 2 KB?                  -> 413 invalid_question, nothing parsed or sent
 *   body not {"question": ...}?      -> 422 invalid_question, nothing sent
 *   ------------------------------------- exactly ONE upstream call from here on
 *   upstream timed out?              -> 504 timed_out
 *   upstream unreachable?            -> 503 unavailable
 *   upstream 422 / 429 / other       -> invalid_question / busy / unavailable
 *   upstream 200, valid              -> 200, one of the six API states
 *   upstream 200, malformed          -> 503 unavailable
 *
 * There is no retry anywhere: a retry would be a second paid call that the
 * visitor never asked for, and it could double a quota charge. A visitor who
 * wants to try again presses the button again.
 */
export async function handleChatRequest(request: Request, deps: BffDeps): Promise<Response> {
  const startedAt = Date.now();
  let questionKind = "none";

  // Every exit goes through here: one JSON response and one log line.
  // `Cache-Control: no-store`: an answer is never cached by a browser or CDN.
  function reply(status: number, view: BrowserView, details: Partial<ChatLogEntry> = {}): Response {
    deps.log?.({
      at: new Date(startedAt).toISOString(),
      route: "/api/chat",
      state: view.state,
      http_status: status,
      latency_ms: Date.now() - startedAt,
      question_kind: questionKind,
      ...details,
    });
    return Response.json(view, { status, headers: { "Cache-Control": "no-store" } });
  }

  // 1. Can the demo run at all? Both checks are about the server, not the
  //    request, so the body is not even read.
  if (!deps.demoEnabled) return reply(503, transportView("unavailable"), { reason: "kill_switch" });
  if (deps.config === null) return reply(503, transportView("unavailable"), { reason: "missing_config" });

  // 2. The browser's request: JSON, at most 2 KB, exactly {"question": ...}.
  if (!declaresJson(request)) return reply(422, transportView("invalid_question"), { reason: "not_json" });
  const body = await readBodyWithLimit(request);
  if (body.kind === "too_large") return reply(413, transportView("invalid_question"));
  const question = parseBrowserQuestion(body.bytes);
  if (question === null) return reply(422, transportView("invalid_question"));

  const upstreamBody = buildUpstreamRequest(question);
  questionKind = upstreamBody.query_id ?? "free_text";

  // 3. Exactly one call to the API.
  //    - `AbortSignal.timeout` aborts the call after 75 s, including reading
  //      the reply's body, so a server that sends headers and then stalls is
  //      a timeout too;
  //    - `redirect: "error"`: the API never redirects. If something on the
  //      way answered with a redirect, following it could carry the token to
  //      another address. It is a network error instead.
  let upstream: Response;
  let upstreamText = "";
  try {
    upstream = await deps.fetchUpstream(`${deps.config.apiUrl}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${deps.config.serviceToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(upstreamBody),
      signal: AbortSignal.timeout(deps.timeoutMs ?? UPSTREAM_TIMEOUT_MS),
      redirect: "error",
    });
    if (upstream.status === 200) {
      upstreamText = await upstream.text();
    } else {
      // Not needed: release the connection without reading the body.
      await upstream.body?.cancel();
    }
  } catch (error) {
    if (isTimeout(error)) return reply(504, transportView("timed_out"));
    return reply(503, transportView("unavailable"), { reason: "network_error" });
  }

  // 4. Map the upstream status (ADR §6.3). The API's own error text is never
  //    passed on: a 401 means OUR credential was refused, and a 500 means a
  //    provider failure. Either way the visitor gets "unavailable".
  if (upstream.status === 422) {
    return reply(422, transportView("invalid_question"), { upstream_status: 422 });
  }
  if (upstream.status === 429) {
    const retryAfter = parseRetryAfter(upstream.headers.get("retry-after"));
    return reply(429, transportView("busy", retryAfter), { upstream_status: 429 });
  }
  if (upstream.status !== 200) {
    return reply(503, transportView("unavailable"), { upstream_status: upstream.status });
  }

  // 5. Even a 200 is untrusted until it matches the contract. On failure the
  //    log says where the reply was wrong, never what it said.
  let parsed: unknown;
  try {
    parsed = JSON.parse(upstreamText);
  } catch {
    return reply(503, transportView("unavailable"), {
      upstream_status: 200,
      validation_error: "response: not JSON",
    });
  }
  const validation = validateQueryResponse(parsed);
  if (!validation.ok) {
    return reply(503, transportView("unavailable"), { upstream_status: 200, validation_error: validation.error });
  }
  return reply(200, toBrowserView(validation.response));
}
