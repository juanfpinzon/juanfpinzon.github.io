/**
 * ProcureRAG case-study evidence.
 *
 * Two rules from the Day 26 inventory (§4) shape everything here:
 *
 * 1. **Every number carries its method.** A metric is published together with
 *    the corpus, the query count, the cut-off, the commit/date it was measured
 *    at, and the command that reproduces it. P@1 is retrieval-ranking
 *    precision, never answer accuracy.
 * 2. **Every claim sits in an evidence lane.** "Demonstrated" (reproducible
 *    now), "demonstrated locally", "historical/deleted", "red/limited" and "not
 *    built yet" are different kinds of truth, and the page labels them in words
 *    so colour is never the only signal.
 *
 * The numbers below were re-run on 2026-10-26 with the live LLM and tracing
 * forced off (`PROCURERAG_LIVE_LLM=0`, `LANGSMITH_TRACING=false`). The run was on
 * ProcureRAG `8c4b64e`, which differs from public `main` at `edf76f5` only in two
 * documentation files, so the results hold for `main`.
 */

const repo = "https://github.com/juanfpinzon/ProcureRAG";
/** Link to a file on ProcureRAG's public `main` branch. */
const onMain = (path: string) => `${repo}/blob/main/${path}`;

export const procureragLinks = {
  repo,
  readme: repo,
  evalReport: onMain("docs/eval-report.md"),
  evalScript: onMain("src/eval_metrics.py"),
  whereItFails: `${repo}#where-it-still-fails`,
  knownLimits: `${repo}#known-limits--not-built-yet`,
  quickstart: `${repo}#quickstart`,
  regressionSuite: onMain("src/regression_suite.py"),
  graphRegression: onMain("src/graph_regression.py"),
  ciWorkflow: onMain(".github/workflows/ci.yml"),
  /** The CI run for the `main` merge at `edf76f5` (success, 2026-10-26). */
  ciRun: `${repo}/actions/runs/40401385508`,
  api: onMain("src/api.py"),
  mcpServer: onMain("src/mcp_server.py"),
  dockerRunbook: onMain("docs/docker-runbook.md"),
  azureRunbook: onMain("docs/azure-container-apps-runbook.md"),
  testQueries: onMain("docs/test-queries.md"),
  contractProbe: onMain("scripts/portfolio_contract_probe.py"),
  corpus: onMain("docs/corpus-v1.md"),
} as const;

/** Where and when the evidence on this page was measured. */
export const measuredAt = {
  date: "2026-10-26",
  commit: "edf76f5",
  commitUrl: `${repo}/commit/edf76f5266963341096876f1ebb11ff23894af3f`,
  /** Exact count for the case study; short surfaces say "430+" (inventory §4). */
  testCount: 452,
} as const;

/** The benchmark every retrieval number refers to. */
export const benchmark = {
  corpus: "synthetic corpus v1: 34 documents of a fictional company, Vantera (570 chunks)",
  queries: 93,
  cutoff: "every ranked list is cut to depth 10 before scoring",
  relevance:
    "binary relevance for P@1, R@5 and MRR@10; graded relevance (primary = 2, secondary = 1) for nDCG@5",
  command: "uv run python src/eval_metrics.py",
} as const;

export type MetricRow = {
  method: string;
  unit: "document" | "chunk→document";
  p1: string;
  r5: string;
  mrr10: string;
  ndcg5: string;
  /** The headline configuration, shown in bold. */
  best?: boolean;
};

/** All nine configurations, exactly as `src/eval_metrics.py` printed them on 2026-10-26. */
export const retrievalMetrics: MetricRow[] = [
  { method: "TF-IDF", unit: "document", p1: "0.871", r5: "0.787", mrr10: "0.924", ndcg5: "0.818" },
  { method: "BM25", unit: "document", p1: "0.860", r5: "0.754", mrr10: "0.910", ndcg5: "0.792" },
  { method: "Dense (multi-qa-MiniLM)", unit: "document", p1: "0.839", r5: "0.673", mrr10: "0.900", ndcg5: "0.740" },
  { method: "Dense (multi-qa-MiniLM)", unit: "chunk→document", p1: "0.925", r5: "0.768", mrr10: "0.954", ndcg5: "0.828" },
  { method: "Hybrid RRF (BM25 + dense)", unit: "document", p1: "0.860", r5: "0.763", mrr10: "0.922", ndcg5: "0.799" },
  { method: "Hybrid weighted, α = 0.5", unit: "document", p1: "0.882", r5: "0.775", mrr10: "0.938", ndcg5: "0.822" },
  { method: "Hybrid RRF (BM25 + dense)", unit: "chunk→document", p1: "0.935", r5: "0.811", mrr10: "0.965", ndcg5: "0.863" },
  { method: "Hybrid weighted, α = 0.5", unit: "chunk→document", p1: "0.925", r5: "0.801", mrr10: "0.961", ndcg5: "0.851" },
  {
    method: "Cross-encoder reranked hybrid RRF",
    unit: "chunk→document",
    p1: "0.978",
    r5: "0.806",
    mrr10: "0.984",
    ndcg5: "0.869",
    best: true,
  },
];

/**
 * The five evidence lanes. `label` is the visible text badge; the page shows it
 * before every item, so the lane is readable in words, not only by colour.
 */
export type LaneId = "demonstrated" | "local" | "historical" | "red" | "notBuilt";

export const lanes: Record<LaneId, { label: string; meaning: string }> = {
  demonstrated: {
    label: "Demonstrated",
    meaning: "Reproducible today from the public repository.",
  },
  local: {
    label: "Demonstrated locally",
    meaning: "Runs on a laptop or in a local container; not hosted.",
  },
  historical: {
    label: "Historical · deleted",
    meaning: "Happened once as a learning exercise; the resources no longer exist.",
  },
  red: {
    label: "Red · limited",
    meaning: "A known failure or a limit of what is built.",
  },
  notBuilt: {
    label: "Not built yet",
    meaning: "Planned; nothing exists to inspect.",
  },
};

export type EvidenceItem = {
  lane: LaneId;
  claim: string;
  evidence: { label: string; href: string };
};

export const evidence: EvidenceItem[] = [
  {
    lane: "demonstrated",
    claim:
      "Retrieval ranking on the 93-query benchmark: cross-encoder reranked hybrid RRF reaches P@1 0.978 (retrieval ranking—not answer accuracy).",
    evidence: { label: "Evaluation report", href: procureragLinks.evalReport },
  },
  {
    lane: "demonstrated",
    claim: `${measuredAt.testCount} automated tests passed on ${measuredAt.date} at commit ${measuredAt.commit}, with no credentials and no network.`,
    evidence: { label: "Repository and quickstart", href: procureragLinks.quickstart },
  },
  {
    lane: "demonstrated",
    claim:
      "Deterministic regressions: 7 of 7 frozen cases as expected, 6 of 6 retrieval verifications OK, 6 of 6 graph-route contracts held.",
    evidence: { label: "Graph regression source", href: procureragLinks.graphRegression },
  },
  {
    lane: "demonstrated",
    claim:
      "Eval-gated CI: three required checks on main (unit and lint, model-backed retrieval and graph regression, Docker build and container smoke).",
    evidence: { label: "CI run for edf76f5", href: procureragLinks.ciRun },
  },
  {
    lane: "local",
    claim:
      "A bounded LangGraph agent with guardrails and a human approval gate, checked with a stand-in model. No conversational memory, no autonomous research.",
    evidence: { label: "Architecture and design decisions", href: `${repo}#architecture` },
  },
  {
    lane: "local",
    claim: "A FastAPI service and a non-root Docker image (arm64 and amd64) that run locally.",
    evidence: { label: "Docker runbook", href: procureragLinks.dockerRunbook },
  },
  {
    lane: "local",
    claim: "One read-only MCP tool over stdio: a local integration, not a remote MCP service.",
    evidence: { label: "MCP server source", href: procureragLinks.mcpServer },
  },
  {
    lane: "historical",
    claim:
      "Deployed to Azure Container Apps by image digest and rolled back once, in a learning exercise. Every resource was deleted the same day; nothing is live.",
    evidence: { label: "Azure runbook", href: procureragLinks.azureRunbook },
  },
  {
    lane: "red",
    claim:
      "Q091's live answer is incomplete: the one live run dropped a required step (details below).",
    evidence: { label: "Where it still fails", href: procureragLinks.whereItFails },
  },
  {
    lane: "red",
    claim:
      "Free-text questions have no gold labels, so their evidence is unchecked; the agentic second pass only runs on the 93 labeled queries.",
    evidence: { label: "Known limits", href: procureragLinks.knownLimits },
  },
  {
    lane: "notBuilt",
    claim:
      "The public demo: a hosted service, a persistent quota, a runtime kill switch and a public URL. The chat, its server-side proxy and the service-token check exist only as a local slice.",
    evidence: { label: "Browser contract probe (no paid calls)", href: procureragLinks.contractProbe },
  },
];

/** Current limits of what is built (README "Known limits"; inventory §4). */
export const limits = [
  {
    title: "Roles are caller-asserted",
    text: "There is no user login. A service token lets only this site's server-side proxy call the API, and the proxy always asks as a requester; the API itself still filters documents by the role its caller states.",
  },
  {
    title: "Approval is stateless",
    text: "A reviewer resends the same request with a decision. The approval record has no reviewer identity.",
  },
  {
    title: "Limits are process-local",
    text: "The rate limiter and the approval checkpointer live in one process's memory: both reset on restart, and each extra worker adds its own rate limit.",
  },
  {
    title: "Free text is unchecked",
    text: "Only the 93 labeled queries have gold evidence. Anything else gets an \"evidence unchecked\" caveat.",
  },
  {
    title: "Sources are IDs only",
    text: "Answers cite document and chunk IDs. There are no snippets, file links or trace links.",
  },
  {
    title: "The corpus is synthetic",
    text: "The numbers compare methods on this benchmark. They are not a claim about real procurement archives.",
  },
] as const;

/**
 * The four approved preset questions (ADR §6.2): exact texts from
 * `data/corpus_v1/example_queries.jsonl`. All four use Internal documents only
 * and never reach the approval gate. Q091 and Q092 are withheld.
 */
export const presets = [
  { id: "Q001", text: "What approval is required for a EUR 60,000 purchase order?" },
  { id: "Q005", text: "What do I have to document after an emergency purchase, and by when?" },
  { id: "Q021", text: "Are facilitation payments ever allowed?" },
  { id: "Q090", text: "What does GRNI mean?" },
] as const;

/** The build progression, in the order it was built. */
export const progression = [
  {
    stage: "Retrieval from primitives",
    text: "An inverted index, TF-IDF and BM25 written by hand, then dense embeddings, sentence-window chunking, hybrid Reciprocal Rank Fusion and a cross-encoder reranker.",
  },
  {
    stage: "Evaluation",
    text: "P@1, R@5, MRR@10 and nDCG@5 over 93 labeled queries; citation and grounding checks; DeepEval and RAGAS judges; a failure taxonomy; frozen regression cases that fail loudly.",
  },
  {
    stage: "Bounded agent graph",
    text: "A LangGraph state graph with a deterministic router: answer, take one approval-gated second retrieval pass, or report the evidence gap.",
  },
  {
    stage: "Guardrails and human approval",
    text: "One guard per layer (input, retrieved context, action, output), mapped to the OWASP Top 10 for LLM applications and mutation-tested; an interrupt-based approve / edit / reject gate.",
  },
  {
    stage: "Serving and delivery",
    text: "FastAPI with server-sent progress events, a Docker image, an Azure Container Apps deployment that was later deleted, eval-gated CI, and a local MCP tool over the same guarded service.",
  },
] as const;

/** What comes next. Nothing in this list exists yet. */
export const roadmap = [
  "A hosted chain with a persistent quota, a spend ceiling, a kill switch and a recorded launch smoke test.",
  "The public cutover of this site, with the old CV link kept working.",
  "A repair for Q091's incomplete answer, with its own regression gate.",
] as const;
