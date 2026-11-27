/**
 * Site-wide facts: who, where, and how to get in touch.
 *
 * Every string here is copied from, or restates without adding to, the accepted
 * Day 26 content inventory (`docs/portfolio-content-inventory.md`, §2 and §7)
 * and the corrected October 2026 CV. Pages import these values instead of
 * retyping them, so a correction is made once and appears everywhere (header,
 * hero, footer, About).
 *
 * This file holds only plain data. It has no React code and no secrets, so it is
 * safe for any component, server or client, to import.
 */

export const person = {
  name: "Juan F. Pinzon",
  fullName: "Juan Fernando Pinzon",
  location: "Barcelona, Spain",
} as const;

/**
 * The home hero (design overhaul, 2026-11-27).
 *
 * - `headline` is the h1: a positioning line, not a job title. The target
 *   title "Senior AI Engineer" stays absent: it is a target role, never an
 *   employer title (inventory §2).
 * - `valueProposition` is the inventory §7 sentence. It now serves as the meta
 *   description and the hero's lede, so search and share cards say exactly
 *   what the page says.
 * - `proof` is the scan line under the hero: four facts, each from the CV.
 */
export const hero = {
  role: "ML/AI engineer",
  headline: { lead: "I build AI systems that", emphasis: "show their evidence." },
  valueProposition:
    "ML/AI engineer with production forecasting and procurement experience, building evidence-driven RAG and agentic applications.",
  lede:
    "I design retrieval, evaluation and agent pipelines that cite their sources, say when the evidence is missing, and are measured at every layer.",
  proof: [
    { value: "2019", label: "Working in ML and data science since" },
    { value: "2022–26", label: "Production forecasting at PepsiCo" },
    { value: "2", label: "Research publications, NLP and time series" },
    { value: "2014", label: "Procurement roots, the domain of ProcureRAG" },
  ],
} as const;

/**
 * Contact and profile links. `href` is the real destination; the tests in
 * `tests/content.spec.ts` assert these exact values so a typo is caught.
 *
 * - `cv` is a same-site path. The PDF in `public/cv.pdf` is a byte-for-byte copy
 *   of `docs/JuanFernandoPinzon_CV_Oct2026.pdf`, the corrected, tagged CV.
 * - LinkedIn redirects logged-out visitors to an auth wall (inventory §1); the
 *   link is still correct, so it stays.
 */
export const links = {
  cv: { label: "CV", href: "/cv.pdf" },
  github: { label: "GitHub", href: "https://github.com/juanfpinzon" },
  linkedin: { label: "LinkedIn", href: "https://www.linkedin.com/in/juanfpinzon/" },
  email: { label: "Email", href: "mailto:juancho704@gmail.com", text: "juancho704@gmail.com" },
  siteSource: {
    label: "Source on GitHub",
    href: "https://github.com/juanfpinzon/juanfpinzon.github.io",
  },
} as const;

/** Header navigation. "Contact" is an in-page anchor on the home page. */
export const navigation = [
  { label: "ProcureRAG", href: "/procurerag" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/#contact-title" },
  { label: "CV", href: links.cv.href },
] as const;

/**
 * "What I bring": six capability areas, each with the evidence behind it.
 * Every sentence restates a CV bullet or a ProcureRAG fact from
 * content/procurerag.ts; `evidence` points to where it is shown in full.
 * PepsiCo facts are CV-reported and describe Juan's own role only.
 */
export const capabilities = [
  {
    id: "retrieval",
    title: "Retrieval and evaluation",
    text: "Hand-written TF-IDF, BM25 and dense retrieval, hybrid Reciprocal Rank Fusion and cross-encoder reranking, scored with P@1, R@5, MRR@10 and nDCG@5, plus regression suites that fail loudly.",
    tags: ["Python", "sentence-transformers", "DeepEval", "RAGAS"],
    evidence: { label: "Retrieval benchmark", href: "/procurerag#evidence" },
  },
  {
    id: "agents",
    title: "Agents and guardrails",
    text: "Bounded LangGraph state graphs with a human-approval gate, and one guard per layer mapped to the OWASP Top 10 for LLM applications and mutation-tested.",
    tags: ["LangGraph", "LangChain", "MCP", "OWASP LLM Top 10"],
    evidence: { label: "Build progression", href: "/procurerag#progression" },
  },
  {
    id: "production-ml",
    title: "Production ML",
    text: "Operated ML forecasting weekly (XGBoost, LightGBM, ensembles) on millions of multi-country rows for PepsiCo's first Integrated Business Planning implementation, and co-led its sustain model design.",
    tags: ["Azure Databricks", "PySpark", "Azure Data Factory"],
    evidence: { label: "Experience", href: "/about#experience-title" },
  },
  {
    id: "shipping",
    title: "Shipping and operations",
    text: "FastAPI with streamed progress, non-root Docker images, eval-gated CI, deployments by image digest with a rehearsed rollback, and a guarded chat proxy with quotas and a kill switch.",
    tags: ["FastAPI", "Docker", "GitHub Actions", "Azure", "Next.js"],
    evidence: { label: "Reproduce it", href: "/procurerag#reproduce" },
  },
  {
    id: "deep-learning",
    title: "Applied deep learning",
    text: "NER sequence taggers, U-NET segmentation on X-rays and LSTM ensembles for market time series: a first-author journal article and a coauthored conference paper.",
    tags: ["PyTorch", "fast.ai", "Flair", "OpenCV"],
    evidence: { label: "Selected work", href: "/#work-title" },
  },
  {
    id: "domain",
    title: "Procurement domain",
    text: "Inventory and textile procurement from 2014, then procurement analytics at PepsiCo: a spend, R&D and bill-of-materials solution, and a global spend-visibility rollout.",
    tags: ["Spend analytics", "Power BI", "Change management"],
    evidence: { label: "Career path", href: "/#career-title" },
  },
] as const;
