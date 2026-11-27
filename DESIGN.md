# DESIGN — portfolio design and information architecture contract

- **Status:** Day 26 contract (2026-10-26), revised by the design overhaul (2026-11-27, branch `design-improvements`): §1, §2 and the recruiter path in §3 describe the shipped "Evidence Lab" system.
- **Owner:** Juan F. Pinzon. **Reviewer:** Hermes (HER-294).
- **Content source:** [`docs/portfolio-content-inventory.md`](docs/portfolio-content-inventory.md). Every claim on the site comes from that table.
- **Architecture source:** [`docs/adr/portfolio-demo-architecture.md`](docs/adr/portfolio-demo-architecture.md).

## 1. Visual direction: Evidence Lab

**Chosen (Juan, 2026-11-27, design overhaul on `design-improvements`):** an "evidence lab" look that reads like a polished eval report. A crisp off-white page, near-black ink and one cobalt accent; a dark "instrument panel" band for the flagship project; a cobalt contact band to close. A characterful grotesk for display, a clean sans for reading, and a mono layer for every number, label and ID: the mono layer is the site's "evidence" voice. Sections are numbered like a report (`01 ——`), so the scroll reads as a sequence of findings.

**Why it replaced "editorial light" (Day 26):**
- The live page read flat and low-contrast: beige on beige, one serif weight, every section the same visual weight, and ProcureRAG third in the scroll inside a muted card.
- The project's real differentiator is "every claim has a number and a documented limit". A report-like system (metric tiles, a request pipeline, a test-report table of recorded runs) shows that instead of describing it.
- The one-accent rule survives: cobalt is the only brand hue, so the status colours (answered / evidence missing / refused) stay meaningful.

**Signature elements:** the highlighter stroke under the hero's claim; the dark ProcureRAG band with a giant wordmark, four metric tiles, a node-and-rail pipeline with a travelling pulse, and five recorded runs including the known failure; the hairline spec grid of skills; the career rail.

**Still rejected:** 3D hero, animated gradients, custom cursors, typing effects, skill-percentage bars and scroll-reveal content (`opacity: 0` until JavaScript runs). The only motion is CSS: a one-time staggered hero entrance, the pipeline pulse and the status beacon. All three stop under `prefers-reduced-motion`, and none hides content without JavaScript.

## 2. Design tokens

Contrast ratios were computed with the WCAG 2.x relative-luminance formula on 2026-11-27. Every text pair passes AA (≥ 4.5:1); control borders and focus rings pass the 3:1 non-text minimum.

### Colour

| Token | Light | Dark | Use | Contrast (light / dark) |
|---|---|---|---|---|
| `--color-bg` | `#F5F5F0` | `#0B0C0F` | page | — |
| `--color-surface` | `#FFFFFF` | `#14161B` | cards, table frame, demo panel | — |
| `--color-sunken` | `#EBEBE4` | `#1C1F25` | career band, tags, code, table head | — |
| `--color-ink` | `#0D0F12` | `#EDEDE8` | body text, headings | 17.6 / 16.7 on bg |
| `--color-ink-muted` | `#50545C` | `#A3A7AF` | metadata, captions, ledes | 7.0 / 8.1 on bg; 6.3 / 6.8 on sunken |
| `--color-accent` | `#2A3DE0` | `#9AABFF` | links, primary button, kicker index, highlights | 6.8 / 9.0 on bg |
| `--color-accent-soft` | `#DFE3FC` | `#1F2656` | tint behind ink text only (hero highlight, best table row) | — |
| `--color-on-accent` | `#FFFFFF` | `#0B0C0F` | text on accent fills | 7.4 / 9.0 |
| `--color-rule` | `#D9D9D1` | `#262A31` | decorative hairlines only, never a control edge | — |
| `--color-border` | `#83868D` | `#6F747D` | inputs, table frame, preset buttons | 3.3 / 4.2 on bg |
| `--color-focus` | `#C2410C` | `#FB923C` | focus ring | 4.7 / 8.6 on bg |
| `--color-ok` | `#1D6B38` | `#74D394` | `answered`, "Demonstrated" lane | 6.0 / 10.7 on bg |
| `--color-warn` | `#865600` | `#EABD5C` | gap / declined / timed out, "Not built yet" | 5.7 / 11.1 on bg; 5.2 on sunken |
| `--color-danger` | `#B02A20` | `#FF8F85` | refused / offline, "Red · limited" | 6.0 / 8.9 on bg |

**Instrument panel** (the dark ProcureRAG band; dark in both themes): `--panel-bg #0D0F12` (dark theme `#121419`), `--panel-raised #16191E`, `--panel-ink #F2F2EE` (17.1:1), `--panel-muted #A4A8B0` (8.1:1), `--panel-accent #9AABFF` (8.8:1), `--panel-ok #74D394`, `--panel-warn #EABD5C`, `--panel-danger #FF8F85` (all ≥ 7.6:1 on panel and raised panel), `--panel-focus #FB923C` (3.7:1 against the band).

**Contact band:** `--contact-bg #2A3DE0` (dark theme `#1E2A8A`), text `#FFFFFF` (7.4:1), muted `#DFE3FF` (6.1:1), focus `#FFD166` (5.5:1 against the band).

- The focus ring is drawn **outside** the element (`outline: 3px solid var(--color-focus); outline-offset: 3px`). Each band sets its own `--color-focus` so the ring keeps 3:1 against the band it sits on.
- Colour is never the only signal. Every demo state and recorded run has a text label; icons are decorative.
- Dark mode follows `prefers-color-scheme` only. A manual toggle is still cut-first (§8).

### Type

| Token | Value |
|---|---|
| `--font-display` | Bricolage Grotesque (variable, with the `opsz` axis), headings, metric numbers, wordmark |
| `--font-body` | Instrument Sans (variable), body text |
| `--font-mono` | JetBrains Mono (variable): kickers, metric labels, IDs, tags, table heads, code |
| Scale | `--step--2` 0.8125rem (mono labels) · `--step--1` 0.9rem · `--step-0` 1.0625rem (body) · `--step-1` 1.25rem · `--step-2` clamp(1.375–1.75rem) · `--step-3` clamp(2–3.25rem) (section titles) · `--step-4` clamp(2.5–5.5rem) (hero) · `--step-5` clamp(2.5–7.5rem) (the ProcureRAG wordmark) |
| Weight | 700 for display; 400/500/600 for body |
| Tracking | display −0.02em to −0.05em as size grows; mono labels +0.06em uppercase |
| Line height | 1.6 body, 1.1 headings, 0.9–1.0 for the hero and wordmark |
| Measure | `max-width: 68ch` for prose; tables and grids may use the full width |
| Alignment | Left-aligned, never justified. `text-wrap: balance` on headings, `pretty` on paragraphs |

All three families are self-hosted through `next/font` at build time; no visitor request goes to Google.

### Space, shape, motion, layout

| Token | Value |
|---|---|
| Spacing scale | 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 px (`--space-1` … `--space-10`) |
| Radius | 6 px controls (`--radius-control`), 10 px cards (`--radius-card`), 4 px tags and lane labels. Pills only for the status line |
| Shadow | none on cards (hairline `--color-rule` edges); one soft shadow under the hero badge and the demo panel |
| Grids | hairline grids (1 px gaps over `--color-rule`) for metric tiles, skills and the About "three kinds of work" |
| Motion | 150 ms ease-out on colour, border and a 1 px button lift; a 520 ms staggered hero entrance; the pipeline pulse (5.5 s loop); the status beacon. Under `prefers-reduced-motion: reduce`, **no** transitions or animations |
| Breakpoints | content-first: 640 px (sticky header, 2-up tiles), 768 px, 900 px (hero two columns, 2-up work cards, test-report rows), 1024 px (horizontal pipeline and career rail, 3-up skills, sticky case-study TOC) |
| Container | max 1200 px, side padding 20 px (mobile) / 40 px (from 1024 px). `<main>` is full width; each section sets its own `.container`, so bands run edge to edge without `100vw` |
| Header | sticky with a translucent blurred background from 640 px; static on phones, where it wraps to two rows |

## 3. Information architecture

Three routes for the preview. Fewer pages mean fewer places for content to drift.

```text
/                 Home: the recruiter path, everything important in one scroll
/procurerag       ProcureRAG case study: the technical path, plus the demo section
/about            Experience, education, research, credentials, CV, contact
/cv.pdf           The corrected CV (source file: docs/JuanFernandoPinzon_CV_Oct2026.pdf). The old /docs/Resume-...pdf URL is handled by the ADR's old-URL policy
```

Global header (text links, no icon-only links): a decorative `JP` monogram with `Juan F. Pinzon` (home) · `ProcureRAG` · `About` · `Contact` (`/#contact-title`) · `CV` (bordered). Footer: GitHub · LinkedIn · Email · "Built with Next.js · Source on GitHub".

### Recruiter path (under a minute, all on `/`)

Revised 2026-11-27: ProcureRAG moved from third to second, directly under the hero, and the page tells one story in six numbered beats.

1. **01 Hero:** a positioning headline ("I build AI systems that show their evidence."), the inventory §7 value proposition, a one-line "how", and actions: `See the flagship project`, `Download CV`, LinkedIn, Email. The portrait carries the current held title as a badge. A ruled proof line gives four CV facts: ML since 2019, production forecasting at PepsiCo 2022–26, two publications, procurement since 2014.
2. **02 ProcureRAG (dark band):** the wordmark and a one-sentence tagline; the separation sentence (synthetic, independent, no employer data, not a production system); `Read the case study` and `Code`. Then:
   - four metric tiles, each with its method under the number (P@1 0.978 retrieval ranking on 93 queries, "not answer accuracy"; 430+ tests + eval-gated CI; 9 retrieval configurations; 4 guard layers);
   - the request path as a rail: question → guards → hybrid retrieval → rerank → agent router → cited answer / evidence-gap report / refusal;
   - **recorded runs** in place of a live chat on the home page: five rows from the Day 29 paid launch smoke on the deployed chain (Q005 answered, Q090 evidence missing, company cars model declined, a prompt injection refused, Q091 answered with two wrong cited claims). The known failure is a row on purpose. Source: ProcureRAG `docs/day-29-runbook.md` §5.5;
   - the status line "Live demo: in progress", saying the hosted chat passed its smoke test and is switched off until launch.
3. **03 Skills, each with its evidence:** six areas in a hairline grid, each with tools and a link to where it is proven.
4. **04 Career path:** five steps from procurement (2014) to the current role (2026), on a rail. Link to `/about`.
5. **05 Selected work and research:** four cards, two per row, problem → my role → result → links, with method tags; the U-NET card floats its X-ray. Then the CS231n archive line.
6. **06 Credentials (small) and contact:** two text credentials, then a cobalt contact band with the email address large, LinkedIn, GitHub and the CV.

### Technical path (`/procurerag`)

Each item in order, with a sticky in-page table of contents on desktop:

1. **Problem and intended users:** procurement policy and supplier questions. Why the domain: Juan's procurement roots.
2. **What I built and what I didn't:** ownership, plus the synthetic corpus (fictional company Vantera, 34 docs, 93 labeled queries).
3. **Progression:**
   - retrieval primitives → hybrid/RRF → reranking → evals;
   - bounded agent graph with guardrails and HITL;
   - FastAPI → Docker → Azure (deleted) → eval-gated CI → local MCP.
4. **Architecture diagram:** an inline SVG with a full text description.
5. **Evidence:** the metrics table, with the method, corpus, cut-off and commit next to every number. P@1 is labeled "retrieval ranking, not answer accuracy".
6. **Failures and limits:** Q091 live-answer failure; caller-asserted roles; stateless approval; free text unchecked; process-local rate limit.
7. **Demo:** the section contract is in §6.
8. **Reproduce it:** commands and links to the runbooks.
9. **Roadmap.**

## 4. Wireframes

> The two home-page wireframes below are the Day 26 originals, kept for history. The 2026-11-27 recruiter path in §3 supersedes them: ProcureRAG now comes second, as a full-width dark band.

### Mobile (360 px), `/`

```text
┌──────────────────────────────┐
│ Juan F. Pinzon        [Menu] │  Menu is a <button> with aria-expanded.
├──────────────────────────────┤  Links: ProcureRAG · About · CV
│ ML/AI engineer with          │
│ production forecasting and   │  h1, --step-4
│ procurement experience,      │
│ building evidence-driven RAG │
│ and agentic applications.    │
│                              │
│ Barcelona · ML since 2019    │  muted
│ [Read the case study →]      │  primary button (accent)
│ CV · LinkedIn · Email        │  text links
├──────────────────────────────┤
│ EXPERIENCE                   │
│ PepsiCo · Data Product Mgmt  │
│  Assoc. Manager · 2026–      │
│ PepsiCo · Data Science Sr.   │
│  Analyst · 2022–2026         │
│ Novel Software · ML Research │
│  2019–2022                   │
│ Earlier roles →              │
├──────────────────────────────┤
│ FLAGSHIP                     │
│ ┌──────────────────────────┐ │
│ │ ProcureRAG               │ │  card (surface)
│ │ Procurement copilot over │ │
│ │ a synthetic KB.          │ │
│ │ P@1 0.978 (retrieval)    │ │  mono chips, wrap
│ │ 430+ tests · eval CI     │ │
│ │ Case study → · Code →    │ │
│ │ Live demo: in progress   │ │
│ └──────────────────────────┘ │
├──────────────────────────────┤
│ SELECTED WORK & RESEARCH     │
│ [NER paper + 545-CV dataset] │  one card per row
│ [Market time-series paper]   │
│ [DICOM2STL (credit: Chen)]   │
│ [U-NET spine PoC]            │
│ Archive: CS231n →            │
├──────────────────────────────┤
│ LEARNING CREDENTIALS         │
│ Boot.dev — Learn RAG, 2026   │
│ HF — MCP Course Unit 1, 2026 │
├──────────────────────────────┤
│ Email · LinkedIn · GitHub    │
└──────────────────────────────┘
```

### Desktop (1280 px), `/`

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Juan F. Pinzon                              ProcureRAG   About   CV  │
├──────────────────────────────────────────────────────────────────────┤
│ ML/AI engineer with production forecasting    │ EXPERIENCE           │
│ and procurement experience, building          │ PepsiCo · DPM Assoc. │
│ evidence-driven RAG and agentic applications. │   Manager · 2026–    │
│                                               │ PepsiCo · DS Sr.     │
│ Barcelona · ML and data science since 2019    │   Analyst · 2022–26  │
│ [Read the ProcureRAG case study →]            │ Novel Software ·     │
│ CV · LinkedIn · Email                         │   ML Research 19–22  │
├──────────────────────────────────────────────────────────────────────┤
│ FLAGSHIP ─ ProcureRAG                                                │
│ ┌──────────────────────────────────┬───────────────────────────────┐ │
│ │ Procurement-intelligence copilot │ P@1 0.978  retrieval ranking  │ │
│ │ over a synthetic knowledge base. │ 430+ tests + eval-gated CI    │ │
│ │ Independent learning project.    │ FastAPI · Docker · local MCP  │ │
│ │ Case study →   Code →            │ Live demo: in progress        │ │
│ └──────────────────────────────────┴───────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────┤
│ SELECTED WORK & RESEARCH                                             │
│ [NER paper + dataset ] [Market TS paper ] [DICOM2STL ] [U-NET PoC ]  │  4 columns ≥1024 px,
│ Archive: CS231n →                                                    │  2 columns 768–1023
├──────────────────────────────────────────────────────────────────────┤
│ LEARNING CREDENTIALS (small)       │ CONTACT  Email · LinkedIn       │
└──────────────────────────────────────────────────────────────────────┘
```

### Desktop, `/procurerag`

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Juan F. Pinzon                              ProcureRAG   About   CV  │
├────────────────┬─────────────────────────────────────────────────────┤
│ ON THIS PAGE   │ ProcureRAG — procurement-intelligence copilot        │
│ Problem        │ Independent learning project · synthetic data ·      │
│ What I built   │ not affiliated with any employer                     │
│ Progression    │                                                      │
│ Architecture   │ [architecture SVG + text description]                │
│ Evidence       │                                                      │
│ Failures       │ | Method | P@1 | R@5 | MRR@10 | nDCG@5 |  (scrolls   │
│ Demo           │   inside its own container on narrow screens)        │
│ Reproduce      │                                                      │
│ Roadmap        │ DEMO  (contract in §6)                               │
└────────────────┴─────────────────────────────────────────────────────┘
```

Mobile `/procurerag` uses one column, and the table of contents becomes a collapsible `<details>` element at the top.

## 5. Accessibility contract (WCAG 2.2 AA)

- **Keyboard:**
  - every interactive element is reachable in DOM order;
  - a "Skip to content" link comes first;
  - no keyboard trap;
  - the chat input submits with Enter, and the preset buttons are real `<button>`s.
- **Focus visible:** the outline rule from §2. `outline: none` is never used without a replacement.
- **Contrast:** the §2 tokens only. New colours need a recorded ratio.
- **Reflow:** usable at 320 CSS px and at 400% zoom with no two-dimensional scrolling. Wide tables scroll inside a labelled region (`role="region"`, `aria-label`, `tabindex="0"`), never the page.
- **Target size:** at least 24 × 24 px (2.5.8). Primary buttons are 44 px tall.
- **Structure:**
  - one `h1` per page, with no skipped heading levels;
  - landmarks `header`, `nav`, `main`, `footer`;
  - `lang="en"`.
- **Links:** descriptive text ("Read the case study", not "click here"). External links say so in text or `aria-label`.
- **Images:**
  - diagrams have a visible text description;
  - decorative images use `alt=""`;
  - no images of text;
  - no certificate images (inventory decision).
- **Documents:** the CV PDF (`/cv.pdf`) is a tagged PDF: H1/H2/H3 headings, reading order, link descriptions, `lang` en and a document title. It is printed from the semantic HTML CV by headless Chrome and checked before publishing (`pdfinfo` reports `Tagged: yes`). A "Save as PDF" export from macOS, Word or Google Docs is untagged and fails this rule.
- **Motion:** none required to read anything. `prefers-reduced-motion` removes all transitions. No autoplay.
- **Chat state:** each result is announced through one `aria-live="polite"` region. The submit button shows a busy state with text ("Waiting for the service…"), not a spinner alone.

## 6. Demo section and fallbacks

The browser contract is the one checked by ProcureRAG's `scripts/portfolio_contract_probe.py`. The browser sends only `{"question": "..."}`. It renders a `state`, a fixed `message`, optional API `text`, IDs-only `sources`, `caveats` and `guards`.

| State | Label (text plus icon) | Shows |
|---|---|---|
| `answered` | Answer · ok | answer text with `[n]` markers, cited sources first, caveats, and "Citation checks passed; correctness is not guaranteed." |
| `model_declined` | Model declined · warn | the model's text and the sources it read |
| `gap_report` | Evidence missing · warn | the gap text. No answer |
| `not_generated` | Retrieval only · neutral | the sources an answer would use. No answer text |
| `blocked` | Refused · danger | the guard message and guard names |
| `pending_approval` | Needs a reviewer · neutral | fixed text. **No approve/edit/reject controls, ever** |
| `invalid_question` | Check your question | 1–500 characters, procurement topic |
| `busy` | Demo limit reached | `retry_after` if given. No automatic retry |
| `timed_out` | Took too long | "The service took too long to answer (it may have been starting up). Please try again in a minute." |
| `unavailable` | Demo offline | links to the case study and code. The rest of the page works |

- **Sources** show `doc_id` and `chunk_id`, plus a doc title only if the ADR's reviewed title map exists. **No invented snippets, file links or trace links.**
- **Presets** are four buttons with the exact approved texts (Q001, Q005, Q021, Q090). Editing a preset's text makes it free text, and the UI says that free-text evidence is unchecked.
- **The transcript** is a visible history in the page only. The UI never implies the model remembers earlier turns.
- **Disclosure,** above the input: "Questions are answered from a synthetic procurement knowledge base. They are sent to a third-party model provider. Do not enter personal or confidential information."
- **Without JavaScript:** every page is static HTML and fully readable. The demo section renders as text: what the demo does, the preset questions, a link to the reproducible local run, and `<noscript>`: "The live demo needs JavaScript. Everything else on this page works without it."
- **Chat down, or the kill switch on:** the `unavailable` state. Nothing else on the page changes.

## 7. Day 27 preview scope

**In:**
- `/`, `/procurerag` and `/about`, with real content from the inventory;
- the corrected CV link (`docs/JuanFernandoPinzon_CV_Oct2026.pdf`, served as `/cv.pdf`) and the new photo: a deliberate head-and-shoulders crop of `assets/img/pic-juan.png` (the source is a full upper-body portrait, so the face would be tiny in an avatar), exported as an optimized WebP/AVIF, not just the 1.9 MB original converted;
- the design tokens, light and dark;
- the accessibility contract above;
- the demo section in its **static, no-JS form only**, labelled "in progress".

**Not in Day 27:**
- the BFF and the live chat (Day 28);
- deployment hardening (Day 29);
- the cutover of `juanfpinzon.github.io` (Day 30).

## 8. Cut-first list

Cut these, in this order, before cutting safety, evidence, the current CV, or the real demo:

1. full bilingual duplication (an optional short Spanish summary is fine);
2. a custom domain;
3. a manual dark-mode toggle;
4. any motion beyond hover/focus;
5. 3D or illustration work;
6. a writing/blog section (the two post drafts stay unpublished until Day 30);
7. analytics.
