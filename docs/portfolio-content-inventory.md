# Portfolio content inventory and evidence crosswalk

- **Status:** Day 26 contract (2026-10-26), for review before Day 27 copy. Committed and pushed on branch `day-26-contract` (`52bb49d`), so it is readable on GitHub. It is not part of the live site.
- **Owner:** Juan F. Pinzon. **Reviewer:** Hermes (HER-294).
- **Scope:** what the new portfolio may say, where each claim comes from, and what is still open. Polished copy comes on Day 27, from this table, not the other way round.
- **Publication guard:** this repository's `master` branch is still published by the legacy Jekyll build (Pages source `master` `/`, build type `legacy`, checked 2026-10-26). Any `.md` file merged to `master` becomes a public page, so this file lives on branch `day-26-contract`, and `_config.yml` excludes it.

## Evidence sources and strength

| Code | Source | Strength |
|---|---|---|
| **R** | Publisher or repository record, read on 2026-10-26: SEPLN journal page metadata, Crossref DOI record, arXiv abstract page, GitHub repository/API, the live site | Independent record of the artifact |
| **CV** | Juan's supplied `JuanFernandoPinzon_CV_Aug2026.pdf` (local file, not in any repo) | Self-reported career facts. Approved for public use by Juan on 2026-10-26; still not an audited employment record |
| **J** | Juan's confirmation in the Day 26 session (2026-10-26) | Owner decision. Recorded, not independently verified |
| **LI** | LinkedIn headline/summary as extracted on 2026-10-26 (Week 6 plan). The profile itself is auth-walled | Partial. The full Experience section has **not** been reviewed |
| **ART** | The two course-award images (local files, not in any repo), read visually on 2026-10-26 | What the artifact prints. Not checked against an issuer verification record |

## 1. Legacy site migration (four work areas plus the site itself)

All link checks: `curl -L` on 2026-10-26, every destination HTTP 200, except where noted.

| Item | Decision | Juan's contribution and ownership boundary | Public evidence / link status | Data or asset permission | Corrections and open items | Answers which question |
|---|---|---|---|---|---|---|
| **U-NET spine / vertebra detection** | **Rewrite**, compact card under *Selected work* | Client research proof of concept at Novel Software Systems (J), H1 2020 (J). Juan did it end to end: extracted thoracic/lumbar spine X-rays from a database of more than 100,000 medical images (J), converted the DICOM files to PNG, then cleaned and filtered them, and classified them with/without implants (basic CNN). He hand-annotated vertebra masks, trained a U-NET (PyTorch + fast.ai), and wrote OpenCV post-processing that draws the vertebrae and measures each one's angle. **The client owns the data and the product. This was a PoC, not a deployed clinical product.** | No public repo or paper. The only asset is `assets/img/img55.png` (an X-ray with overlays), served at 200 | The old site itself says materials "can't be shared". **Owner decision (J, 2026-10-26, after review): `img55.png` is not a privacy or permission blocker.** The project used data that was anonymized before it reached Juan, and the image is cleared for use (§5.1). The new card is text-only by default (`DESIGN.md`). Adding the image is Juan's Day 27 choice | "100,000 thousand" → **"more than 100,000"** (J, 2026-10-26). Typos: "where converted", "pos-processing". Year: **H1 2020** (J, 2026-10-26) | Recruiter: earlier applied DL depth. Technical: data pipeline → model → post-processing, honestly scoped |
| **Resume/CV NER, publication, dataset, notebooks** | **Promote**: lead card under *Selected research*. It is the strongest public artifact from that period | Team research at Novel Software Systems (CV). Juan is **first author** of the paper (R). The dataset was annotated by the team ("annotated by ourselves", README) (R) | Paper: *Limitations of Neural Networks-based NER for Resume Data Extraction*, J. F. Pinzon, S. Krainikovsky, R. Samarev, *Procesamiento del Lenguaje Natural* **65**, 2020-09-01, pp. 53–58 (R, journal page metadata). The link answers 200 over HTTP, but its HTTPS certificate does not match the host, so the site should link it as `http://`. Dataset repo `juanfpinzon/resume-dataset`: 200; its README title is "**545 CVs with NER Annotations**" (R). Notebooks: 200 (GitHub blob URLs in this repo) | Dataset: already public in Juan's repo, built from CVs "obtained from open sources". Link the repo; **never display CV content or use it in a demo**. `skills-semantic-similarity-scoring-50cvs.ipynb` has 29 distinct email addresses in its saved outputs (R, scanned 2026-10-26). **Owner decision (J, 2026-10-26, after review): not a blocker.** Juan states that the CVs, including these addresses, were anonymized before they reached him. The notebook stays as it is and may be linked (§5.1) | CV says "SEPLN 2021" → **Vol. 65 (2020)**. Old site body says "500" (its link text says 545) → **"545 (as documented in the dataset README)"**. Old site says "a well known NLP conference" → **journal article in *Procesamiento del Lenguaje Natural***. Keep the honest result: the models **did not meet the client's production expectations**. Tools (J, 2026-10-26): **Flair/PyTorch BiLSTM-CRF sequence taggers with stacked FastText and contextual string embeddings**, matching the corrected CV and the public notebook (which uses Flair only) | Recruiter: published, first author. Technical: an honest negative result, i.e. an evaluation mindset |
| **DICOM2STL / Autobone context** | **Rewrite**, compact card under *Selected work* (engineering) | Juan **adapted and extended** the open-source `dicom2stl` by **David T. Chen (NIAID)**, Apache-2.0 per its README (R). In `juanfpinzon/dicom2stl` (not a GitHub fork), the first 100 commits on `master` are ~76 Juan and ~24 Dave Chen (GitHub API, R). Juan's additions include a cranial-tuned pipeline (`dicom2stl_tuned.py`), skull extraction, a DICOM organizer, CLI flags and a notebook. It was client work for Autobone at Novel Software Systems (J). **Juan does not own Autobone or its implant-prediction model** | Repo: 200. Autobone link `autobone.nprog.ru/login`: 200, but it is a **login page**, not evidence. Drop the link and name the product in text | Public repo. **Credit the upstream author and license on the site.** The repo has no `LICENSE` file although its README states Apache-2.0. Restoring it is Juan's call (non-blocking) | "it's filter" → "its"; "a key element of the a product". **Confirmed** (J, 2026-10-26): the tuned pipeline produced the 1,000+ cranial meshes that formed the client's implant-model training data, and this may be said publicly. Card wording: "Used to convert 1,000+ cranial CT scans into STL meshes for the client's implant-model training data." | Technical: medical-imaging data engineering and code-ownership honesty |
| **CS231n implementations** | **Archive**: one line under *Foundations*, no image | Juan's self-paced solutions to Stanford CS231n (Spring 2019) assignments. Stanford owns the course content | Repo `juanfpinzon/CS231n-self-paced`: 200, created 2019-09. Course page: 200 (http→https redirect) | `assets/img/cs231n.png` likely reproduces course material: **do not migrate** | None | Technical: from-scratch fundamentals. It must not compete with ProcureRAG |
| 2021 CV `docs/Resume-Juan-Pinzon_11.09.21.pdf` | **Replace at launch** | — | 200 | Already public | The preview links Juan's **corrected CV**, now at `docs/JuanFernandoPinzon_CV_Oct2026.pdf` (NER 2020, AGI wording, ProcureRAG added, "since 2019", Flair NER tools, "ML/AI Engineer" header; checked 2026-10-26). Keep the old URL working: see the ADR's old-URL policy | Recruiter: CV |
| Photo, contact links (mailto, LinkedIn, GitHub) | **Replace** the photo with `assets/img/pic-juan.png` (J); **keep** the contact links, as text links (no icon-only links) | — | All 200. LinkedIn redirects to an auth wall | New photo supplied by Juan, committed in `52bb49d`. Review (2026-10-26): no visible sensitive detail, no GPS metadata. It is a 1.9 MB **full upper-body** portrait, so the face would be tiny in an avatar. Day 27 makes a deliberate **head-and-shoulders crop** and serves an optimized version of the crop (e.g. WebP via `next/image`), not just the original converted | — | Recruiter: contact |
| `another-page.html`, the commented-out theme demo in `index.md`, the empty GA include, theme fork files (`*.gemspec`, `script/`, Ruby 2.7 CI, `Jmuccigr-patch-1` branch) | **Remove** at migration | Leftovers from forking `pages-themes/minimal` (R: this repo's GitHub parent) | `another-page.html` is still public ("Welcome to another page _yay_") | — | No analytics in the new site by default | — |

## 2. Career crosswalk

The CV is the baseline. Juan confirmed **no changes since August 2026**, and approved the CV wording (including program names and CV-reported metrics) for the public site (J, 2026-10-26). Employer facts below are **CV-reported**: the site attributes them to Juan's own role and never links internal dashboards or systems.

| Fact | CV (Aug 2026) | Old site (2021) | LinkedIn (accessible part) | Public decision | Status |
|---|---|---|---|---|---|
| Headline | "Senior AI Engineer \| LLM Applications & Agentic AI \| Machine Learning in Production" (target) | "Data Scientist and Machine Learning Researcher/Developer" | "AI Transformation \| Data Science & ML Engineering \| LLM Applications & Agentic AI \| Digital Strategy at Scale" | Site hero: see §7. "Senior AI Engineer" is a **target**, never an employer title | Hero decided (J). CV header decided (J): "ML/AI Engineer \| Machine Learning in Production \| LLM Applications & Agentic AI". "Senior AI Engineer" is dropped |
| Tenure | "7 years building and deploying production machine learning across NLP, time-series forecasting, and computer vision" | — | "5+ years" | **"Working in ML and data science since 2019; production forecasting at PepsiCo since 2022."** It never goes stale, and it separates research (2019–2022) from production (2022–). The corrected CV uses the same wording | Decided (J) |
| Current role | Data Product Management Associate Manager, PepsiCo, Jan 2026–present, Barcelona | — | Summary mentions PepsiCo transformation and procurement/agentic focus | Exact title. Approved bullets: agentic AI roadmap for Digital Procurement (RAG-based knowledge agents, RaaS), prototyping on Copilot declarative agents and PepsiCo's internal AI platform, solution architecture input. **Not** "AI Engineer", and no claim of shipped enterprise LLM production systems | Approved (J) |
| Previous role | Data Science Sr. Analyst, PepsiCo, May 2022–Jan 2026 | — | Production ML, Azure/PySpark | Prominent. ML forecasting (XGBoost, LightGBM, ensembles) on millions of multi-country rows weekly for the first IBP implementation (Iberia, 2022–2024). Co-led the Sustain model design (governance, documentation, monitoring, retraining). Azure Databricks, PySpark, Data Factory. Beyond Spend dashboard: 4+ weeks → near-real-time. SpendHQ European rollout, 100+ procurement members | Approved (J), CV-reported |
| Research role | ML Researcher / DL Consultant, Novel Software Systems, Aug 2019–May 2022, Novosibirsk | Research projects | — | Research and client consulting. Links to both papers. U-NET and DICOM2STL were client work here (J) | Approved |
| Earlier roles | ITMS Business/Systems Analyst (Nov 2018–Aug 2019); Aritex Production Planning Analyst (Aug–Dec 2016); STF Group Procurement & Inventory Analyst (Jan 2014–Jul 2016, "reduced obsolete inventory by 20%") | — | — | Compact rows. **STF Group** is the procurement-domain root of ProcureRAG | Approved |
| Education | M.Sc. Big Data Analytics & AI, NSU (2017–2019); B.B.A., Universidad ICESI (2015) | "M.Sc Big Data Analytics & AI, Business Administration bachelor" | — | Concise, visible on *About* | Approved |
| Location / languages | Barcelona; Spanish (native), English (full professional), Russian (elementary) | — | — | Shown on *About* | Approved |
| Projects | OpenClaw/Hermes only. **No ProcureRAG** | — | — | ProcureRAG is the flagship. OpenClaw/Hermes is a compact secondary card (wording in §2.1) | Both decided (J). Upstream links for the Hermes card: open (§6 #7) |
| Full LinkedIn Experience | — | — | Not reviewed (auth wall, no export) | Not claimed as reconciled | Open (non-blocking; needs an export or screenshots) |

**Production versus research, stated once and reused everywhere.** Production ML: PepsiCo forecasting (2022–). Applied research and client PoCs: Novel Software Systems (2019–2022). Independent learning project: ProcureRAG (2026). The CV summary's "7 years building and **deploying** production machine learning across NLP … and computer vision" is the single most dangerous over-claim on file. The NER research did not reach production, and the U-NET was a PoC. The corrected CV replaces it with the "since 2019" wording above.

### 2.1 Employer separation and secondary-project wording

- **ProcureRAG:** "An independent learning project: a procurement-intelligence copilot over a **synthetic** knowledge base (34 documents of a fictional company, Vantera), built to practise retrieval, evaluation, bounded agents, serving and deployment. It has no PepsiCo affiliation and no employer data, systems or endorsement, and it is not a production system." Not "a PDF chatbot". Not an employer deployment.
- **OpenClaw/Hermes (confirmed by Juan, 2026-10-26, same wording as the corrected CV):** "Configured and extended the open-source OpenClaw and Hermes Agent frameworks (credited upstream) with personally authored Python automations: Linear, GitHub and Telegram connectors, an LLM-based pull-request review watchdog, news and newsletter pipelines, a Markdown shared-memory vault and context-engineering conventions for coding agents." Juan wrote the listed automations; he did not write the frameworks. Public code that can back the newsletter pipelines: `juanfpinzon/AndyJuan_Newsletter`, `juanfpinzon/DP_news_scout` (both public). **Open (non-blocking):** the upstream URLs for OpenClaw and Hermes Agent, so the card can link the credit.

## 3. Publications, dataset and credentials

| Item | Exact public wording | Source and strength | Decision |
|---|---|---|---|
| NER paper | J. F. Pinzon, S. Krainikovsky, R. Samarev. "Limitations of Neural Networks-based NER for Resume Data Extraction." *Procesamiento del Lenguaje Natural* 65 (2020), pp. 53–58 | R: journal page metadata (2020-09-01) | Use **2020** everywhere. Corrected in the October CV copy (the original August attachment stays unchanged) |
| Market/time-series paper | A. Kolonin, A. Raheman, M. Vishwas, I. Ansari, J. Pinzon, A. Ho. "Causal Analysis of Generic Time Series Data Applied for Market Prediction." **AGI 2022 proceedings (published 2023)**, LNCS, pp. 30–39, doi:10.1007/978-3-031-19907-3_4. Preprint: arXiv:2204.12928 (2022) | R: Crossref (online 2023-01-14); arXiv (v1 2022-04-22, "submitted to Artificial General Intelligence 2022 conference") | Coauthor. Link both DOI and preprint. Juan's part per the CV: co-developed models and contributed to a PyTorch backtesting framework |
| NER dataset | "545 CVs with NER annotations (as documented in the dataset README)" | R: repo README | Link the repo only |
| Boot.dev | **Boot.dev — Learn Retrieval Augmented Generation**, certificate of completion, **18 September 2026** | ART: prints the recipient "Juan Fernando Pinzon", the date and credential ID `5a4079c0-…d2d6`. **No public verification URL is printed** | **Text only** (J). No image, no "Verify" button, credential ID not shown. The printed "Topics mastered" label is not used as a claim. Paired with ProcureRAG retrieval primitives → hybrid/RRF → reranking → retrieval evals |
| Hugging Face | **Hugging Face — The MCP Course, Unit 1: Fundamentals of MCP**, certificate of achievement, **22 October 2026** | ART: prints "Juan Pinzon", the date and "Hugging Face Instructors". No credential ID or URL | **Text only** (J). Always "Unit 1", **never the whole course**. Paired with ProcureRAG's local stdio MCP tool and its stdio smoke |
| Microsoft Azure AI Engineer Associate | "in progress" | CV | CV only, **in progress**. Not in the site's credentials list until earned |
| Other CV certificates | (n8n, Spark, Coursera ML, Foundation Negotiator, PepsiCo Internal Coach 2025) | CV only, not verified | CV only. Not on the site |

The original award images and the August CV PDF stay outside both public repositories. The only personal files published on Day 26 are Juan's corrected CV and photo, pushed by Juan on branch `day-26-contract` (§5).

## 4. ProcureRAG claims and their evidence lane

| Claim | Evidence | Lane | Public wording rule |
|---|---|---|---|
| Retrieval ranking: cross-encoder reranked hybrid RRF, chunk→doc, **P@1 0.978, MRR@10 0.984, nDCG@5 0.869, R@5 0.806** | ProcureRAG `README.md`; reproducible with `uv run python src/eval_metrics.py` | **Demonstrated** (reproducible) | Always with: 93 labeled queries, synthetic corpus v1 (34 docs), depth-10 cut. "Retrieval ranking precision, **not answer accuracy**" |
| 445 automated tests at ProcureRAG `8323b48` (2026-10-26); deterministic regressions (7/7 frozen, 6× retrieval `[OK]`, 6/6 graph contracts) | Day 26 gate run (learning log) | **Demonstrated** | The case study gives the exact count with its commit and date. Short surfaces (the home chip, the CV) say **"430+ tests"**, which does not go stale as tests are added |
| Bounded LangGraph agent with guardrails and an approval gate | Graph regression, `tests/` | **Demonstrated locally** (stand-in LLM) | Not "autonomous research"; no conversational memory |
| FastAPI service, Docker image (arm64/amd64) | Day 21–22 runbooks | **Local only** | "Runs locally / in a container" |
| Azure Container Apps deployment, digest-gated promotion, rollback | Day 23–24 evidence | **Historical, resources deleted** | "Deployed and rolled back in a learning exercise; not live" until Day 29 |
| Eval-gated CI | GitHub Actions runs (Day 24–25) | **Demonstrated** (public runs) | Link the run |
| MCP tool over stdio | Day 25 smoke and Inspector | **Local only** | "Local MCP integration", not a remote MCP service |
| Live generated answers are correct | Q091 live answer omits the "usage data" step (Day 24) | **Red** | Never claimed. Q091 shown as a known failure |
| Free-text questions are evidence-checked | Free text has no gold labels | **Not true** | The UI shows the "unchecked" caveat |
| Public demo | Day 26 contract and no-paid probe only | **Not built** | No "Try demo" link until Day 29 evidence exists |

## 5. Asset and publication permissions

| Asset | Owner | Public now? | Decision |
|---|---|---|---|
| August 2026 CV PDF (original) | Juan | No (local) | Stays private |
| Corrected CV `docs/JuanFernandoPinzon_CV_Oct2026.pdf` | Juan | **Yes, on GitHub**: committed in `52bb49d`, branch `day-26-contract` pushed 2026-10-26. Not linked from the live site | Approved for public use (J). This is the file the site links |
| Award images (Boot.dev PNG, HF WEBP) | Juan | No (local) | Stay private. Text-only claims (J) |
| `img55.png` (medical X-ray) | Client; anonymized before it reached Juan (J) | Yes (old site) | Cleared for use (J, §5.1). Stays on the legacy site until cutover. Reuse on the new site is Juan's Day 27 choice |
| `cs231n.png` | Likely Stanford course material | Yes (old site) | Not migrated |
| `skills-semantic-similarity-scoring-50cvs.ipynb` | Juan (code); CV data in outputs, anonymized before it reached Juan (J) | Yes (repo) | Cleared (J, §5.1). Stays as it is, may be linked |
| `ner-training-template.ipynb` | Juan | Yes (repo) | May be linked (no personal data found in a scan for emails and phone numbers) |
| `photo_round.png` | Juan | Yes | Not reused. Replaced by `pic-juan.png` (J) |
| `pic-juan.png` | Juan | **Yes, on GitHub**: committed in `52bb49d`. Not linked from the live site | Approved (J). Day 27: head-and-shoulders crop, then optimize |
| ProcureRAG synthetic corpus | Juan (synthetic, fictional company) | Yes (public repo) | Public demo retrieves only its **Internal**-labeled documents (ADR) |

### 5.1 Owner decision on review finding 1: the legacy notebook and X-ray

Hermes review round 1 (2026-10-26) rated two live legacy assets as a blocker to fix now, not at launch: the 29 email addresses in the saved outputs of `skills-semantic-similarity-scoring-50cvs.ipynb` (linked from `index.md`), and the X-ray `img55.png` (embedded in `index.md`).

**Juan does not accept the blocker rating** (J, 2026-10-26):

- both projects were done on **anonymized data**. The CVs, including the email addresses in the notebook outputs, and the X-ray were anonymized **before they reached Juan**;
- so the data and the images are **cleared for use**, on the current site and on the new one.

Consequences:
- the notebook and `img55.png` stay public as they are;
- no output clearing and no history purge;
- §6 #5 is closed.

This rests on Juan's statement (code **J**). The anonymization happened upstream, before the data reached him, so there is no record of it in this repository. If a later review needs more than the owner's word, the evidence to add is the data provider's anonymization or release note, not a code change.

## 6. Unresolved questions

Answers recorded from Juan on 2026-10-26.

| # | Question | Owner | Blocking? | Needed by | Status / answer |
|---|---|---|---|---|---|
| 1 | Produce the corrected CV copy (NER 2020; AGI 2022 proceedings, published 2023; ProcureRAG; "since 2019"; Azure stays in progress) | Juan | Blocked the preview's CV link | Day 27 | **Done:** `docs/JuanFernandoPinzon_CV_Oct2026.pdf` (all corrections present, checked 2026-10-26) |
| 2 | U-NET project year | Juan | No | Day 27 | **Answered:** H1 2020 |
| 3 | NER tools wording | Juan | No | Day 27 | **Answered:** Flair/PyTorch (BiLSTM-CRF, stacked FastText + contextual string embeddings) |
| 4 | "1,000+ cranial STL models" for Autobone | Juan | No | Day 27 | **Confirmed:** true and publishable. Wording in §1 |
| 5 | Clear notebook outputs with personal data; purge history? | Juan | **No** (J) | — | **Closed (J, 2026-10-26):** the data was anonymized before it reached Juan. The outputs stay. See §5.1 |
| 6 | Restore `LICENSE` (Apache-2.0) in `dicom2stl` | Juan | No | Day 30 | Open |
| 7 | OpenClaw/Hermes: own components vs credited upstream | Juan | No | Day 27 | **Confirmed:** the CV's component list is Juan's own work. Still open: the upstream URLs for OpenClaw and Hermes Agent |
| 8 | CV header target title: keep "Senior AI Engineer"? | Juan | No | Day 30 | **Answered:** no, "ML/AI Engineer" |
| 9 | LinkedIn Experience export for a full crosswalk | Juan | No | Day 30 | Open |
| 10 | Reuse the profile photo? | Juan | No | Day 27 | **Answered:** no; use `assets/img/pic-juan.png` |

## 7. Hero and value proposition

- **Main (selected):** "ML/AI engineer with production forecasting and procurement experience, building evidence-driven RAG and agentic applications."
- **Short alternative:** "Production ML engineer building evidence-driven RAG and agents for procurement."
- **Supporting line:** "Working in ML and data science since 2019. Production forecasting at PepsiCo since 2022, procurement roots since 2014, and now hands-on RAG, evaluation and agent engineering."

Both keep the evidence order: experience and shipped/reproducible work first, course awards last. Neither turns recent coursework into years of LLM experience.
