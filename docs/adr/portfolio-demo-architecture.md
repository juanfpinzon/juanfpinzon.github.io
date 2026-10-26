# ADR: portfolio and public ProcureRAG demo architecture

- **Status:** **Accepted** for Day 27–29 implementation planning (2026-10-26). **Provisioning and any paid call are blocked** until the items in §11 are closed.
- **Owner / decider:** Juan F. Pinzon. **Reviewer:** Hermes (HER-294, gate HER-271).
- **Review state:** accepted by the owner. Hermes review round 1 (2026-10-26) was made against portfolio `52bb49d` and ProcureRAG `8323b48`. The owner follow-up was re-reviewed at portfolio `57d45e4` and ProcureRAG `00f32c0`; the body limit, lease-based admission, malformed-upstream handling, accessible CV and evidence wording passed. The closure review made one docs-only fail-closed correction in §8.3.1: a BFF timeout or disconnect does not prove the Azure/provider work stopped, so it must not release the lease early. HER-294 closure is recorded in Linear and the shared-memory vault.
- **Evidence:**
  - ProcureRAG `src/api.py` (the `QueryRequest` / `QueryResponse` contract and its "Honest limits");
  - ProcureRAG `scripts/portfolio_contract_probe.py` (the no-paid contract probe);
  - the Day 23–24 Azure runbook and learning-log measurements;
  - the official docs read on 2026-10-26 (§2).

## 1. Context

The portfolio needs a fast recruiter page and a deep case study. It also needs a public chat that calls the real ProcureRAG service.

ProcureRAG today:
- a Python FastAPI service with typed statuses and IDs-only sources;
- no authentication: the role is caller-asserted;
- a learning-grade, in-process rate limit;
- an opt-in paid LLM;
- a 59–72 s cold start on Azure Container Apps from zero replicas (59.07 s on Day 23, 71.5 s on Day 24, `/health`, LLM off);
- nothing live: the Azure resources were deleted.

The current portfolio is Jekyll `jekyll-theme-minimal` (a fork of `pages-themes/minimal`). Pages builds it from `master` `/` (build type `legacy`, HTTPS enforced, no custom domain). It has no Node manifest.

## 2. What the hosting and protocol docs allow (read 2026-10-26)

- **Next.js static export** (`output: 'export'`, docs updated 2026-08-09):
  - Server Components run at build time;
  - Route Handlers export only a static `GET` (`force-static`);
  - "Route Handlers that rely on Request", Cookies, Headers, Redirects, Rewrites, Server Actions and default-loader Image Optimization are **unsupported**.

  **So a static export cannot hold a runtime chat `POST` or a server-side credential.**
- **GitHub Pages:**
  - "GitHub Pages does not support server-side languages such as PHP, Ruby, or Python";
  - sites are public;
  - a custom build publishes through a GitHub Actions workflow;
  - soft limits of 100 GB/month bandwidth and 10 builds/hour for branch builds;
  - not for SaaS or commercial transactions.

  **So Pages can host the static portfolio, never the BFF or the Python service.**
- **Vercel Functions** (limits page updated 2026-08-24; Fluid compute):
  - Hobby: 300 s default and maximum duration, 2 GB / 1 vCPU;
  - 4.5 MB request/response body;
  - single region by default (`iad1`), changeable;
  - "Vercel deployments use dynamic IPs by default".
- **MCP transports (2025-11-25):**
  - stdio: the client launches the server as a subprocess, and the server "MUST NOT write anything to its stdout that is not a valid MCP message";
  - Streamable HTTP needs one MCP endpoint (POST/GET), `Origin` validation (403 on an invalid Origin), authentication, `MCP-Session-Id` and `MCP-Protocol-Version` handling.

  **So ProcureRAG's stdio server cannot be called from a browser, and a remote MCP server would be a separate network, auth and session product.**

## 3. Decision

**Next.js (App Router, TypeScript) on Juan's personal Vercel Hobby account serves the portfolio and a same-origin BFF (`POST /api/chat`). The BFF calls the existing ProcureRAG FastAPI container on Juan's Azure subscription in `northeurope`, with a server-held service credential.** Portfolio pages are pre-rendered. The Python service stays the only retrieval/agent/LLM pipeline. The two repositories stay separate. The local stdio MCP adapter stays a developer integration over the same Python service.

```text
Browser (static pages + chat form)
  │  POST /api/chat  {"question": "..."}             same origin, no secrets in the bundle
  ▼
Vercel BFF route handler (Node.js runtime)
  │  kill switch → body ≤ 2 KB / question 1–500 chars → one atomic admission (in-flight lease + global + per-client quota)
  │  → fixed role "requester" → preset text ⇒ query_id, else none → never a decision
  │  POST {PROCURERAG_API_URL}/query   Authorization: Bearer <service token>
  ▼
Azure Container Apps, northeurope: ProcureRAG FastAPI (min 0 / max 1 replica)
  │  service-token check → rate limit → schema → query_id check → input/scope guards
  │  → approval boundary → role-filtered retrieval → guarded graph → optional LLM
  ▼
QueryResponse → BFF validates it and reduces it to a BrowserView (state, message, text, IDs-only sources, caveats, guard names)

Local AI host (Claude Code, Inspector) → stdio MCP adapter (src/mcp_server.py) → the same guarded service
```

## 4. Options considered

| Option | Benefit | Cost / risk | Verdict |
|---|---|---|---|
| **A. Next.js on Vercel + same-origin BFF + Azure ProcureRAG** | TypeScript/React product-layer evidence. Server-only secrets. Same origin, so no CORS for the browser. Preview deploys per branch. 300 s function ceiling covers the measured cold start. Reuses the Week 5 container | Two hosts plus a quota store. The public URL leaves `github.io` unless a custom domain is bought (§9). Vercel's dynamic egress IPs rule out IP allow-listing at Azure | **Accepted** (Juan, 2026-10-26) |
| B. Static Next.js export on GitHub Pages + separate gateway/BFF + Azure | Keeps the `juanfpinzon.github.io` URL. Static hosting is simple | Pages cannot run the BFF (§2), so a separate gateway is still needed. The browser then calls a different origin: an exact-origin CORS policy, and CORS is not authentication. Two hosts anyway, with less same-origin simplicity | **Rejected as default, kept as the fallback** if Vercel is blocked |
| C. Portfolio + gateway served from the Python container | One deployment, one origin | Couples the portfolio's availability to the model container's cold start and to scale-to-zero. Little TypeScript/React evidence. Every copy fix rebuilds and redeploys the model-baked image | **Rejected.** Scope-saving fallback only |
| D. Whole model-backed service on Vercel Functions (Python) | One vendor | Unmeasured: bundle (500 MB Python limit; 5 GB "large functions" is beta), model loading and cold start under 2 GB / 1 vCPU. The Azure image is the measured artifact | **Deferred.** Needs its own fit test |
| E. Browser → remote MCP | Protocol reuse | Needs a host/client in the browser, plus Origin, auth, session and protocol-version handling, and adds nothing to a web form | **Rejected for the web demo.** Remote MCP deferred |

## 5. Repository, account and hosting boundaries

| Concern | Decision |
|---|---|
| Portfolio repo | `juanfpinzon/juanfpinzon.github.io`, default branch `master` |
| Branch flow | Day 26 contract on `day-26-contract`. Next.js work on a new branch (Day 27). `master` keeps the legacy Jekyll site until cutover (§9) |
| ProcureRAG repo | `juanfpinzon/ProcureRAG`, `main`. Owns the API, the image, the evals, and the probe |
| Frontend host | Vercel Hobby, **Juan's personal account**. Hobby's personal-use terms must be re-checked on Day 28 before linking the repo |
| Backend host | Azure Container Apps, **Juan's subscription**, region **`northeurope`** (Day 23: `westeurope` refused new resources; `northeurope` validated) |
| Function region | Set the Vercel function region to Dublin (`dub1`), next to `northeurope` (Ireland). Verify availability on Hobby on Day 28 |
| Cross-repo evidence | Each release records the portfolio commit, Vercel deployment URL, ProcureRAG commit, image digest/revision, and the probe/smoke results |

## 6. The contract

### 6.1 Browser → BFF

`POST /api/chat`, JSON `{"question": string}`, 1–500 characters, body ≤ 2 KB. **Any other key is a 422, and nothing is sent upstream.** That covers `role`, `query_id` and `decision` (probe: "browser sends a role -> 422 before upstream").

The 2 KB limit is checked on the **raw bytes, before parsing**, and answers 413. A 500-character question in valid JSON can be padded with whitespace to any size, and every check after parsing would accept it (probe: "body over 2 KB (whitespace padding) -> 413 before parsing"). The BFF stops reading at 2 KB + 1 byte: it does not call `request.json()` first, because that reads the whole body. A `Content-Length` check alone is not enough, since a chunked request has none. A body that is not valid JSON is a 422.

### 6.2 BFF → API

The BFF sends `POST /query` with `{"query": question, "role": "requester"}`, plus `"query_id"` **only** when the question equals an approved preset text character for character. It is validated against `api.QueryRequest` before sending. It never carries a `decision`. JSON `/query` is the first vertical slice. `/query/stream` (stage-progress SSE, **not token streaming**) is stretch, and is not exposed to the browser in the first slice.

Approved presets (exact texts from `data/corpus_v1/example_queries.jsonl`):

| id | Text | Why public |
|---|---|---|
| Q001 | What approval is required for a EUR 60,000 purchase order? | Threshold; gold docs POL-001, FAQ-001 (Internal) |
| Q005 | What do I have to document after an emergency purchase, and by when? | Three-document procedure; FAQ-001, POL-001, SOP-008 (Internal) |
| Q021 | Are facilitation payments ever allowed? | Compliance rule; POL-005 (Internal) |
| Q090 | What does GRNI mean? | Term definition; GLOSSARY-001, SOP-002 (Internal) |

None of the four has a follow-up pass, so none can reach `pending_approval` (checked by the probe against the real follow-up table). **Q091 is withheld**: it needs reviewer approval, and its live answer is a known failure. **Q092 is withheld**: it needs a Confidential contract.

### 6.3 API → BFF → browser

| API / transport outcome | BFF HTTP | UI state | What the visitor sees |
|---|---|---|---|
| `answered` | 200 | `answered` | answer, cited and uncited sources (IDs), caveats, "citation checks passed; correctness not guaranteed" |
| `model_declined` | 200 | `model_declined` | the model's decline text, the sources it read |
| `gap_report` | 200 | `gap_report` | gap text (restricted-gap text when a hidden doc is missing). No answer |
| `not_generated` | 200 | `not_generated` | fixed "retrieval-only" message and sources. API text hidden (operator detail) |
| `blocked` | 200 | `blocked` | API refusal text, guard names |
| `pending_approval` | 200 | `pending_approval` | fixed "needs a reviewer, not offered in the public demo". API text (which invites a `decision`) and `approval_request` are **dropped** |
| 422 (BFF or API), or a body that is not valid JSON | 422 | `invalid_question` | fixed guidance |
| body over 2 KB (BFF, before parsing) | 413 | `invalid_question` | fixed guidance |
| 429 (BFF quota or API limit) | 429 | `busy` | fixed text, plus `retry_after` when `Retry-After` is a whole number of seconds. A date form, a negative number or garbage is dropped, never a crash. No automatic retry |
| timeout | 504 | `timed_out` | "may have been starting up, try again in a minute" |
| connection failure, any other upstream status (500 provider failure, 401 refused credential, …), a malformed upstream 200 (not JSON, or not a `QueryResponse`), kill switch | 503 | `unavailable` | "demo offline". The case study and code links stay. The BFF logs the status and the validation error type, never the body |

Never forwarded: `run_id` (trace rows are not persisted, and raw traces may be sensitive), `approval_request`, and the findings' `detail` text. **Sources are IDs only** (`source_id`, `doc_id`, `chunk_id`, `cited`). There are no snippets, file URLs or trace links. A Day 28 option, not decided: a build-time `doc_id → title` map generated from the synthetic corpus, reviewed before use.

All eleven rows are exercised by the no-paid probe (19 scenarios, exit 0, 2026-10-26), including an upstream 500 from the real API, a cut-off 200, a wrong-shape 200 and a date-form `Retry-After`.

## 7. Public data, role and trust policy

- **Public allowlist:** the 24 **Internal**-labeled documents of the synthetic corpus v1:
  - FAQ-001–002;
  - GLOSSARY-001;
  - GUIDE-001–005;
  - POL-001–008;
  - SOP-001–008.

  All are fictional ("Vantera"). The 10 Confidential documents (CONTRACT-001–006, AUDIT-001, MEMO-001, RFP-001, SCORECARD-001) stay invisible: they are never relabeled public. The API's role filter enforces this; the probe checks it.
- **Role:** fixed server-side as `requester`. **No role picker.** Escalation fields are rejected (422), not ignored.
- **Approval / HITL:** none in public mode. `pending_approval` fails closed. Privileged walkthroughs (Q091/Q092 approve/edit/reject) stay local: curl or MCP elicitation.
- **No uploads, writes or supplier data.** The input is one question; the visible transcript is UI history, not model memory.
- **Free text:** never carries a `query_id`. The API adds the "no gold labels, evidence unchecked" caveat, and the UI shows it.
- **Identity:** the BFF's credential is **service identity** ("this request came through my BFF"). It is not a visitor identity, not an enterprise login, and not proof of anyone's role.

## 8. Security, cost and operations

### 8.1 Upstream authentication and secrets

- **Decided:** the FastAPI service checks a dedicated service token (`Authorization: Bearer …`, constant-time compare) on `/query` and `/query/stream`, **before** the rate limit and before any parsing or retrieval. A missing or wrong token gets 401.
  - This is a ProcureRAG `src/` change, owned by Juan, on Day 28, with tests.
  - Without it, anyone can bypass the BFF and call the public Azure URL directly, and CORS cannot stop curl.
  - Azure built-in authentication (Easy Auth) is the alternative to evaluate in the Day 29 reading.
  - IP allow-listing is not viable: Vercel egress IPs are dynamic.
- **Secrets:**
  - the service token lives as a Vercel server-side env var (never `NEXT_PUBLIC_*`) and an Azure Container Apps secret;
  - `OPENROUTER_API_KEY` lives only in Azure;
  - neither appears in bundles, source maps, logs, the repo or docs;
  - rotation is manual: rotate both ends together.
- `/health` stays unauthenticated (no data, no LLM). The platform probes need it.

### 8.2 Spend ceilings (approved by Juan, 2026-10-26)

- **LLM:** **US$5 per month.**
- **Cloud:** **US$10 per month.**

These are ceilings to design to, not price quotes. Azure budgets only **alert**. The real stops are:

1. the global request quota (§8.3);
2. a provider-side key credit limit on the OpenRouter key, set to the LLM ceiling (feature to verify on Day 28);
3. max 1 replica;
4. the kill switch.

If the Azure subscription is still the Day 23 free trial (spending limit `On`), the trial's own limit also stops it. Check its status and expiry on Day 29.

### 8.3 Quota, concurrency and bounds

| Control | Decision | Status |
|---|---|---|
| Global daily cap | `floor(LLM ceiling ÷ 30 ÷ worst-case cost of one request)`. The worst case is computed from the chosen model's published price × (max context + public output cap). Until computed, **no paid request is allowed** | Day 28 (blocks paid smoke) |
| Public output cap | Lower than the code's current `MAX_ANSWER_TOKENS = 3000`, set by configuration for the public deployment, so that the worst case fits the US$5 ceiling | Day 28 |
| Model | Picked against the ceiling. A US$5/month ceiling with an expensive model means single-digit daily requests. Record the trade-off | Day 28 |
| Quota store | Persistent, atomic, outside process memory. A Redis-compatible store on the BFF side (e.g. via the Vercel Marketplace; free tier and Lua scripting (`EVAL`) to verify). Every admission is one atomic script (§8.3.1). Resetting a cookie bypasses nothing | Day 29 |
| Store unavailable | **Fail closed**: the `busy`/`unavailable` state, nothing sent upstream | Decided |
| In-flight cap | 2 concurrent upstream calls (one 1-vCPU replica), held as one lease per request (§8.3.1), not as a counter | Decided |
| Per-client cap | 10 questions/day per client, keyed by a salted hash of the client IP from Vercel's platform-set headers, never from a browser-supplied header. Weak (NAT, rotation): the global cap is the real spend control | Decided, Day 29 implementation |
| Input / body | Question 1–500 chars (same as `api.MAX_QUERY_CHARS`), body ≤ 2 KB at the BFF, checked on the raw bytes before parsing (413) | Decided (probe) |
| Retries | **None automatic** at the browser, BFF or API. A visitor's manual retry consumes quota | Decided (probe: exactly 1 upstream call) |
| Cancellation | A closed browser tab, BFF timeout or terminated function does **not** prove the Azure/provider work stopped. Release the lease only after a completed response or definitive upstream error. On timeout, disconnect or process death, leave it for expiry | Decided |

#### 8.3.1 Admission: one atomic script, one lease per request

**Rejected: one in-flight counter with a TTL** (the first Day 26 draft). A single key cannot track requests that start and end at different times:
- if each admission refreshes the key's TTL, a slot leaked by a crashed function lives on for as long as other traffic keeps arriving;
- if admissions do not refresh it, the key can expire while later requests are still running. The count restarts at 0, and more than 2 calls get in;
- a `DECR` does not say *which* request ended, so a double or late release corrupts the count.

**Decided: one lease per request, in a Redis sorted set** (`inflight`):
- a **member** is one request's random lease id. Its **score** is the time the lease expires. The provisional lease is 180 s; Day 29 must verify that it is longer than the measured cold-start + provider-timeout + cleanup path, not merely longer than Vercel `maxDuration`;
- **admission** is one Lua script. Redis runs a script atomically: no other command runs between its steps.
  1. `ZREMRANGEBYSCORE inflight -inf <now>` drops expired leases.
  2. If `ZCARD inflight` ≥ 2, or the global day counter or this client's day counter is at its cap: refuse (`busy`) and change nothing.
  3. Otherwise: `ZADD inflight <expiry> <lease id>`, `INCR` both day counters (each with an `EXPIRE` after its day ends), and accept.

  The script checks every cap before it changes anything, so a refusal reserves nothing and no rollback `DECR` is needed;
- **release:** `ZREM inflight <lease id>` only after a completed upstream response or a definitive upstream error. Releasing twice, or after expiry, is harmless. A BFF timeout, browser disconnect or function termination does **not** release: the backend/provider may still be running, so the lease remains until expiry;
- **lease TTL:** provisional 180 s. It must exceed the measured worst-case continuation from admission (including cold start and the provider's 60 s timeout) with a safety buffer. Comparing it only with Vercel `maxDuration` is insufficient because Azure work can continue after the Vercel function stops. If any component timeout increases, this TTL must be re-derived;
- `now` is passed in by the BFF, not read inside the script. Clock skew between function instances is milliseconds against this lease;
- the day counters count attempts: a request that fails upstream is not refunded (the same rule as a manual retry).

**Residual:** after a BFF timeout, a lease may conservatively occupy a slot until expiry even if Azure stopped immediately. That can temporarily reduce availability, but it fails closed for concurrency and spend. Day 29 measures the end-to-end continuation window and confirms the 180 s provisional TTL before public chat is enabled.

### 8.4 Timeouts and cold start

| Hop | Timeout | Reason |
|---|---|---|
| Provider call (inside the API) | 60 s (existing) | Day 19–21 setting |
| BFF → API `/query` | 75 s | provider 60 s + retrieval + margin |
| BFF → API `/health` (warm-up) | 90 s | covers the measured 59.07–71.5 s cold starts |
| Vercel `maxDuration` for both routes | 100 s | under the Hobby 300 s maximum |
| Browser `AbortController` | 105 s | slightly above the BFF, so the BFF's typed state wins |

**Scale-to-zero (min 0 / max 1)** is decided by the US$10 cloud ceiling: a warm replica bills all the time. To avoid a 60–70 s wait inside the question itself, the page **warms on intent**:
- when the demo section is opened, the browser calls `GET /api/chat/status`, and the BFF calls the API's free `/health` (no LLM);
- the UI shows "Waking the service (about a minute)";
- the status route has its own per-client and global limit, so it cannot be used to keep the replica warm all day;
- there are no repeated POSTs to warm the service.

A question sent to a cold replica can still exceed 75 s. It then ends in `timed_out`, honestly.

**Residual risk:** the Azure ingress is public, so **any** request to it (even one refused with 401) wakes the replica, at the cost of compute time. The bounds are max 1 replica, the Azure budget alert, and the kill switch (§8.6). Day 29 computes the worst-case month (one replica running 24/7) from the current price sheet. If that exceeds US$10, the alert threshold and the kill-switch procedure must catch it within a day.

### 8.5 Logging, tracing and retention

- **BFF logs:** timestamp, route, state, HTTP status, latency, `preset id` or `free_text`, and quota counters. An upstream protocol failure (a malformed 200) is logged as the upstream status and the validation error type. **Never** the question, the answer, an upstream body or a raw IP.
- **API:** LangSmith tracing off (`LANGSMITH_TRACING=false`, `LANGSMITH_TRACING_V2=false`). Trace rows are built but not persisted (existing). Uvicorn access logs hold the path, status and the BFF's egress IP, never bodies.
- **Azure Log Analytics:** keep the platform default retention (30 days; confirm on Day 29). No raw traces, prompt logs or transcripts are retained or published.
- **Disclosure** on the demo: synthetic data; questions go to a third-party model provider; do not enter personal or confidential data. The provider's data-retention and no-training settings are chosen on Day 28 and named in the disclosure.

### 8.6 Kill switch

- **Owner:** Juan.
- **Primary:** a flag read by the BFF on every request (its location, a quota-store key or an edge config, is chosen on Day 29). It must not be a build-time env var, because Vercel applies env changes only to new deployments.
- **Secondary:** disable Azure ingress or scale max replicas to 0.
- **Tertiary:** revoke the OpenRouter key.
- **Test:** the probe already shows the BFF logic: 503 `unavailable` and **zero** upstream calls. Day 29 repeats it on the deployed chain, and records the time from flip to effect.

## 9. Migration, old URL and rollback

1. **Before migration:** tag `master`'s current commit `7526f0c` as `legacy-jekyll-2021`, and branch `legacy-jekyll` from it.
2. **Until cutover (Day 30):** Pages keeps serving Jekyll from `master`. Next.js is reviewed on Vercel preview URLs.
3. **Public URL:** by default the canonical site becomes the Vercel production URL (`*.vercel.app`). `juanfpinzon.github.io` is on Juan's CV and LinkedIn, and **it cannot be pointed at Vercel**.
   - At cutover, the Pages source switches to a GitHub Actions workflow that publishes a minimal static artifact:
     - an `index.html` with the canonical link, a meta refresh and a visible link to the new URL;
     - the corrected CV published at the legacy path `/docs/Resume-Juan-Pinzon_11.09.21.pdf`, so old links get the current CV.
   - A custom domain removes the `vercel.app` URL, but it is cut-first and needs its own spend approval (§11).
4. **Rollback:**
   - frontend: Vercel instant rollback to the previous deployment;
   - old site: set the Pages source back to branch `legacy-jekyll`;
   - backend: activate the previous revision by image digest (Day 24 procedure);
   - chat-only failure: the kill switch, while the portfolio stays up.

## 10. Quality gate: plumbing is not correctness

- **Q091:** withheld from presets and from any "try this" copy. Typed as free text, it runs unlabeled with the "unchecked" caveat, and its pass-1 evidence may miss what the answer needs. That is a recorded residual risk, not a fix. A disclaimer is not a repair. A repair needs its own evidence-backed gate with regression protection.
- **Launch smoke set v1** (Day 29, live, through the deployed chain), recording the expected evidence and the actual behaviour:
  - Q001, Q005 and Q021 as presets;
  - a Q001 paraphrase as free text: "Who needs to approve a purchase order worth EUR 60,000?";
  - an in-scope but unanswerable question: "What is the policy for buying company cars for executives?";
  - an injection attempt (expected `blocked`);
  - Q091's text as free text (a known failure: record what happens).
- Fake, frozen and `not_generated` results are separate evidence lanes from live generation.

## 11. Open decisions that block provisioning

| # | Decision | Owner | Blocks | Needed by |
|---|---|---|---|---|
| 1 | Implement and test the service-token check in ProcureRAG (§8.1) | Juan | any public upstream | Day 28 |
| 2 | Model choice, worst-case cost per request, public output cap, global daily cap (§8.3) | Juan | any paid call | Day 28 |
| 3 | OpenRouter key credit limit available and set to US$5 | Juan | paid smoke | Day 28 |
| 4 | Vercel account, Hobby terms fit, `dub1` region | Juan | Vercel deploy | Day 28 |
| 5 | Quota store provider, free tier, Lua scripting support, and the §8.3.1 admission script with tests | Juan | public chat | Day 29 |
| 6 | Azure subscription status (trial expiry/credit/spending limit) and worst-case monthly cost vs US$10 | Juan | Azure provisioning | Day 29 |
| 7 | Kill-switch location, and a deployed test | Juan | public chat | Day 29 |
| 8 | Provider data-retention/no-training settings and disclosure text | Juan | public chat | Day 29 |
| 9 | Public URL: `vercel.app` + `github.io` redirect, or a custom domain (separate spend) | Juan | launch copy, CV/LinkedIn URL | Day 30 |
| 10 | `doc_id → title` source map (optional) | Juan | nothing | Day 28 |

## 12. Consequences

- **Gains:**
  - secrets stay server-side;
  - the browser contract is small and typed;
  - the six statuses stay distinct;
  - the portfolio does not depend on the chat;
  - the Python pipeline is reused, not rewritten in TypeScript.
- **Costs:**
  - two hosts plus a quota store;
  - a URL change unless a domain is bought;
  - a cold start that the UX must be honest about;
  - a src/ change (the service token) before anything is public.
