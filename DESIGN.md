# DESIGN — portfolio design and information architecture contract

- **Status:** Day 26 contract (2026-10-26). It guides the Day 27 preview; it is not an implementation.
- **Owner:** Juan F. Pinzon. **Reviewer:** Hermes (HER-294).
- **Content source:** [`docs/portfolio-content-inventory.md`](docs/portfolio-content-inventory.md). Every claim on the site comes from that table.
- **Architecture source:** [`docs/adr/portfolio-demo-architecture.md`](docs/adr/portfolio-demo-architecture.md).

## 1. Visual direction: editorial light

**Chosen (Juan, 2026-10-26):** a readable editorial engineering style. Warm paper background, near-black ink and one deep-teal accent. Serif headings over a clean sans body, with monospace only for metrics, IDs and code. Real diagrams and evidence tables carry the "engineer" signal, not decoration.

**Why:**
- Most of the technical path is long-form reading: the case study, metric tables and failure analysis. A light, left-aligned layout with a 68-character measure reads best.
- A recruiter skimming for 60 seconds gets strong hierarchy and no visual noise.
- One accent keeps status colours (answered / refused / gap) meaningful in the demo.

**Rejected:**

| Alternative | Why not |
|---|---|
| Editorial dark, charcoal/cream/gold (Hafsa-inspired) | Too close to cloning a reference's identity. Long tables in light-on-dark are harder to keep comfortable and AA-compliant. It survives only as this design's dark mode, a token swap |
| Engineering notebook (mono headings, visible grid) | Reads like a developer blog and weakens the recruiter path |
| 3D hero, animated gradients, custom cursor, typing effects, skill-percentage bars, scroll-reveal content | Decoration over evidence. Scroll-reveal (`opacity: 0` until JavaScript runs) hides content without JS. Skill bars are unmeasurable |

## 2. Design tokens

Contrast ratios were computed with the WCAG 2.x relative-luminance formula on 2026-10-26. Every text pair passes AA (≥ 4.5:1), and borders pass the 3:1 non-text minimum.

### Colour

| Token | Light | Dark | Use | Contrast (light / dark) |
|---|---|---|---|---|
| `--color-bg` | `#FAF8F3` | `#161514` | page | — |
| `--color-surface` | `#F1EDE4` | `#211F1D` | cards, demo panel, table stripes | — |
| `--color-ink` | `#1C1B19` | `#EDE9E1` | body text, headings | 16.2 / 15.1 on bg |
| `--color-ink-muted` | `#5C5850` | `#A8A296` | metadata, captions | 6.7 / 7.2 on bg; 6.1 / 6.5 on surface |
| `--color-accent` | `#0F5E5A` | `#6CC1B8` | links, primary button, focus of attention | 7.2 / 8.7 on bg |
| `--color-on-accent` | `#FFFFFF` | `#0B1F1E` | text on accent buttons | 7.6 / 8.1 |
| `--color-border` | `#8C8578` | `#77716A` | input and card borders | 3.5 / 3.8 on bg |
| `--color-focus` | `#B4540A` | `#F2A65A` | focus ring | 4.7 / 9.0 on bg |
| `--color-ok` | `#2F6B3A` | `#7CC48A` | `answered` state label | 6.0 / 8.8 on bg |
| `--color-warn` | `#8A5A00` | `#E0B252` | `gap_report`, `model_declined`, `timed_out` labels | 5.6 / 9.3 on bg |
| `--color-danger` | `#A3302B` | `#F08A80` | `blocked`, `unavailable` labels | 6.6 / 7.5 on bg |

- The focus ring is low-contrast against the accent fill itself (1.5:1). So it is always drawn **outside** the element, with `outline: 3px solid var(--color-focus); outline-offset: 3px`, which puts it against `bg` or `surface`.
- Colour is never the only signal. Every demo state has a text label and an icon with an accessible name.
- Dark mode follows `prefers-color-scheme` only. A manual toggle is cut-first (§8).

### Type

| Token | Value |
|---|---|
| `--font-heading` | Source Serif 4 (600), self-hosted via `next/font` |
| `--font-body` | Inter (400/600), self-hosted via `next/font` |
| `--font-mono` | JetBrains Mono (400), metrics, IDs, code only |
| Scale | `--step--1` 0.875rem · `--step-0` 1.0625rem (body) · `--step-1` 1.25rem · `--step-2` 1.5rem · `--step-3` clamp(1.75rem, 1.4rem + 1.5vw, 2.25rem) · `--step-4` clamp(2rem, 1.5rem + 2.5vw, 3rem) (hero) |
| Line height | 1.6 body, 1.2 headings |
| Measure | `max-width: 68ch` for prose; tables may use the full content width |
| Alignment | Left-aligned. **Never justified**: the old site's justified paragraphs leave uneven word gaps |

### Space, shape, motion, layout

| Token | Value |
|---|---|
| Spacing scale | 4, 8, 12, 16, 24, 32, 48, 64, 96 px (`--space-1` … `--space-9`) |
| Radius | 4 px controls, 8 px cards. No pill-shaped everything |
| Shadow | none; cards use `--color-surface` and a 1 px border |
| Motion | 150 ms ease-out, opacity/transform only, for hover and focus. Under `prefers-reduced-motion: reduce`, **no** transitions. Content never depends on motion |
| Breakpoints | content-first: single column below 768 px; two columns from 1024 px |
| Container | max 1120 px, side padding 20 px (mobile) / 32 px (desktop) |

## 3. Information architecture

Three routes for the preview. Fewer pages mean fewer places for content to drift.

```text
/                 Home: the recruiter path, everything important in one scroll
/procurerag       ProcureRAG case study: the technical path, plus the demo section
/about            Experience, education, research, credentials, CV, contact
/cv.pdf           The corrected CV (source file: docs/JuanFernandoPinzon_CV_Oct2026.pdf). The old /docs/Resume-...pdf URL is handled by the ADR's old-URL policy
```

Global header (text links, no icon-only links): `Juan F. Pinzon` (home) · `ProcureRAG` · `About` · `CV`. Footer: GitHub · LinkedIn · Email · "Built with Next.js · Source on GitHub".

### Recruiter path (under a minute, all on `/`)

1. **Hero:** name, the selected value proposition, location (Barcelona), and links: `Read the ProcureRAG case study`, `CV`, `LinkedIn`, `Email`.
2. **Experience summary:** three rows. PepsiCo Data Product Management Associate Manager (2026–). PepsiCo Data Science Sr. Analyst, production forecasting (2022–2026). Novel Software Systems ML researcher (2019–2022). The line "Earlier: procurement and operations roles (2014–2019)" links to `/about`.
3. **Flagship card, ProcureRAG:**
   - one sentence: independent, synthetic data;
   - three evidence chips: "P@1 0.978 retrieval ranking (93 queries)", "445 tests + eval-gated CI", "guarded FastAPI + local MCP";
   - links: `Case study` and `Code`;
   - demo status written honestly: "Live demo: in progress" until Day 29 evidence exists.
4. **Selected work and research:** four cards, each laid out as problem → Juan's role → result → link:
   - NER paper and dataset;
   - market time-series paper;
   - DICOM2STL, with upstream credit;
   - U-NET spine PoC (text only).

   Then one archive line: CS231n.
5. **Credentials (small):** two text lines (Boot.dev RAG; HF MCP Unit 1), each linked to the matching ProcureRAG evidence.
6. **Contact:** email and LinkedIn as text links. No form.

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
│ │ 445 tests · eval CI      │ │
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
│ │ over a synthetic knowledge base. │ 445 tests + eval-gated CI     │ │
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
| `timed_out` | Took too long | "It may have been starting up (about a minute after idle). Try again." |
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
- the corrected CV link (`docs/JuanFernandoPinzon_CV_Oct2026.pdf`, served as `/cv.pdf`) and the new photo (`assets/img/pic-juan.png`, optimized);
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
