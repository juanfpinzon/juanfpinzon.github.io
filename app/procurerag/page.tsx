import type { Metadata } from "next";
import { ArchitectureDiagram } from "@/components/ArchitectureDiagram";
import { ChatPanel } from "@/components/ChatPanel";
import { ExternalLink } from "@/components/ExternalLink";
import { LaneLabel } from "@/components/LaneLabel";
import {
  benchmark,
  evidence,
  lanes,
  limits,
  measuredAt,
  procureragLinks,
  progression,
  retrievalMetrics,
  roadmap,
  type LaneId,
} from "@/content/procurerag";
import { person } from "@/content/site";
import { shareMetadata } from "../share-metadata";

/*
 * `/procurerag`: the technical path (DESIGN §3).
 *
 * The page is a long-form evidence document. Its job is to let a technical
 * interviewer inspect what was built, how it was measured, where it fails and
 * how to reproduce it, without the page ever implying that the public demo or
 * a hosted service exists.
 *
 * Server Component, prerendered at build time. The "On this page" menu is a
 * native <details> element, so nothing here needs client JavaScript except
 * the chat: <ChatPanel /> is the one Client Component island (Day 28). It is
 * imported here and rendered inside the demo section; everything around it
 * stays server-rendered HTML.
 */

const title = "ProcureRAG case study";
const description =
  "ProcureRAG, an independent learning project: a procurement-intelligence copilot over a synthetic knowledge base. Retrieval measured on 93 labeled queries, known failures and limits, and how to reproduce it. Live demo in progress.";

export const metadata: Metadata = {
  title,
  description,
  // The share tags need the full title: `title.template` only applies to <title>.
  ...shareMetadata(`${title} — ${person.name}`, description),
};

/** The in-page sections, in reading order. Used by both tables of contents. */
const sections = [
  { id: "problem", label: "Problem and users" },
  { id: "ownership", label: "What I built" },
  { id: "progression", label: "Progression" },
  { id: "architecture", label: "Architecture" },
  { id: "evidence", label: "Evidence" },
  { id: "failures", label: "Failures and limits" },
  { id: "demo", label: "Demo" },
  { id: "reproduce", label: "Reproduce it" },
  { id: "roadmap", label: "Roadmap" },
] as const;

function TocList() {
  return (
    <ol>
      {sections.map((section) => (
        <li key={section.id}>
          <a href={`#${section.id}`}>{section.label}</a>
        </li>
      ))}
    </ol>
  );
}

const laneOrder: LaneId[] = ["demonstrated", "local", "historical", "red", "notBuilt"];

export default function ProcureRagPage() {
  return (
    <div className="case-layout">
      {/*
        Two copies of the same table of contents; CSS shows exactly one.
        Narrow screens: a native <details> disclosure, collapsed by default, so
        the article starts near the top. It opens and closes without any
        JavaScript. Wide screens: a sticky sidebar list.
      */}
      <nav className="toc toc--narrow" aria-label="On this page">
        <details>
          <summary>On this page</summary>
          <TocList />
        </details>
      </nav>
      <nav className="toc toc--wide" aria-label="On this page">
        <p className="eyebrow">On this page</p>
        <TocList />
      </nav>

      <article aria-labelledby="case-title">
        <h1 id="case-title">ProcureRAG: a procurement-intelligence copilot</h1>
        <p className="muted">
          Independent learning project · synthetic data · not affiliated with any employer
        </p>
        <p className="status">Live demo: in progress</p>
        <p>
          <ExternalLink href={procureragLinks.repo}>ProcureRAG code on GitHub</ExternalLink>
          {" · "}
          <ExternalLink href={procureragLinks.evalReport}>Evaluation report</ExternalLink>
        </p>

        {/* 1. Problem and intended users */}
        <section aria-labelledby="problem">
          <h2 id="problem">Problem and intended users</h2>
          <p>
            Procurement teams answer the same policy questions again and again: who must approve a
            purchase of a given size, what an emergency purchase needs afterwards, which supplier
            rules apply. The answers are spread across policies, procedures, contracts and FAQs.
          </p>
          <p>
            ProcureRAG answers those questions with cited sources from a procurement knowledge base,
            for two kinds of user: <strong>requesters</strong> (employees who need to buy something)
            and <strong>buyers</strong> (procurement staff, who may also read confidential
            documents).
          </p>
          <p>
            Why this domain: my career started in procurement and inventory (2014–2016), and my
            current role is in Digital Procurement, so I know what a wrong answer costs. The project
            uses none of any employer&apos;s data or systems.
          </p>
        </section>

        {/* 2. Ownership and the synthetic corpus */}
        <section aria-labelledby="ownership">
          <h2 id="ownership">What I built, and what I didn&apos;t</h2>
          <p>
            An independent learning project, built in daily increments since September 2026. Each
            increment had a course source, an artifact, verification commands and a written log.
          </p>
          <h3>What I built</h3>
          <ul>
            <li>
              Retrieval from primitives (inverted index, TF-IDF, BM25, dense embeddings, Reciprocal
              Rank Fusion, cross-encoder reranking) and a nine-configuration benchmark.
            </li>
            <li>
              The evaluation layer: citation and grounding checks, LLM-as-judge harnesses, a failure
              taxonomy and regression suites that fail loudly.
            </li>
            <li>
              A bounded LangGraph agent with an approval gate, guardrails at four layers, a FastAPI
              service, a Docker image, eval-gated CI workflows and a local MCP adapter.
            </li>
          </ul>
          <h3>What I did not build</h3>
          <ul>
            <li>
              The frameworks (LangGraph, LangChain, FastAPI, the MCP Python SDK, DeepEval, RAGAS) are
              open source and named where they are used.
            </li>
            <li>
              The embedding and reranking models are pretrained (multi-qa-MiniLM-L6 and
              ms-marco-TinyBERT-L2); I did not train them.
            </li>
            <li>
              Answers come from a third-party model API through OpenRouter (gpt-4o for the
              evaluations, gpt-4o-mini for the chat), routed only to zero-data-retention endpoints.
              It is opt-in and off by default; the tests and evaluations need no API key.
            </li>
          </ul>
          <h3>The data is synthetic</h3>
          <p>
            All 34 documents describe a fictional company, <strong>Vantera</strong>, and were
            written for this project: 24 Internal and 10 Confidential documents, split into 570
            chunks, plus <strong>93 labeled queries</strong> with expected documents, graded
            relevance and expected answers. No employer data, systems, affiliation or endorsement
            is involved, and ProcureRAG is not a production system.{" "}
            <ExternalLink href={procureragLinks.corpus}>Corpus documentation</ExternalLink>
          </p>
        </section>

        {/* 3. Progression */}
        <section aria-labelledby="progression">
          <h2 id="progression">Progression</h2>
          <p>Each stage was built and measured before the next one started:</p>
          <ol>
            {progression.map((step) => (
              <li key={step.stage}>
                <strong>{step.stage}.</strong> {step.text}
              </li>
            ))}
          </ol>
          <p className="muted small">
            Structured sources: the Boot.dev course “Learn Retrieval Augmented Generation” for the
            retrieval stages, and Unit 1 of the Hugging Face MCP Course for the MCP tool.
          </p>
        </section>

        {/* 4. Architecture */}
        <section aria-labelledby="architecture">
          <h2 id="architecture">Architecture</h2>
          <ArchitectureDiagram />
        </section>

        {/* 5. Evidence */}
        <section aria-labelledby="evidence">
          <h2 id="evidence">Evidence</h2>
          <p>
            Every number below names its method, corpus, query count, cut-off and the commit it was
            measured at. They were re-run on {measuredAt.date} at commit{" "}
            <ExternalLink href={measuredAt.commitUrl}>
              <code>{measuredAt.commit}</code>
            </ExternalLink>
            , with the live model and tracing switched off.
          </p>

          <h3>Retrieval ranking</h3>
          {/*
            The method details live in this paragraph, not in the <caption>:
            a caption is as wide as its table, so on a phone it would scroll
            out of view together with the table.
          */}
          <p className="small">
            Nine retrieval configurations on {benchmark.queries} labeled queries, synthetic corpus
            v1 (34 documents, 570 chunks), depth-10 cut. Measured {measuredAt.date} at{" "}
            {measuredAt.commit}. On narrow screens the table scrolls sideways.
          </p>
          {/*
            Wide-table rule (DESIGN §5, WCAG 1.4.10): the table scrolls inside
            this labelled, focusable region, never the page.
          */}
          <div
            className="table-scroll"
            role="region"
            aria-label="Retrieval metrics table, scrolls horizontally"
            tabIndex={0}
          >
            <table>
              <caption>Retrieval ranking by method</caption>
              <thead>
                <tr>
                  <th scope="col">Method</th>
                  <th scope="col">Retrieval unit</th>
                  <th scope="col" className="num">
                    P@1
                  </th>
                  <th scope="col" className="num">
                    R@5
                  </th>
                  <th scope="col" className="num">
                    MRR@10
                  </th>
                  <th scope="col" className="num">
                    nDCG@5
                  </th>
                </tr>
              </thead>
              <tbody>
                {retrievalMetrics.map((row) => (
                  <tr key={`${row.method}-${row.unit}`} className={row.best ? "best" : undefined}>
                    <th scope="row">{row.method}</th>
                    <td>{row.unit}</td>
                    <td className="num">{row.p1}</td>
                    <td className="num">{row.r5}</td>
                    <td className="num">{row.mrr10}</td>
                    <td className="num">{row.ndcg5}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-5">
            <strong>P@1 0.978 is retrieval ranking—not answer accuracy.</strong> It counts how often
            the top-ranked document is one of the expected documents for the question. It says
            nothing about whether a generated answer is correct or complete (see Q091 below).
          </p>
          <ul className="small">
            <li>Relevance: {benchmark.relevance}.</li>
            <li>Cut-off: {benchmark.cutoff}, so MRR is MRR@10.</li>
            <li>
              Reproduce: <code>{benchmark.command}</code> (about 16 seconds on a laptop CPU).{" "}
              <ExternalLink href={procureragLinks.evalReport}>Full methodology</ExternalLink>
            </li>
          </ul>
          <p>What the numbers say:</p>
          <ul>
            <li>
              Changing the retrieval unit beat changing the algorithm: dense retrieval over chunks
              instead of whole documents gains 0.086 P@1, more than any document-level fusion.
            </li>
            <li>
              The reranker is a precision tool, not a recall tool: +0.043 P@1 over its first stage,
              while R@5 moves −0.005, because it only re-orders the same 15-chunk shortlist.
            </li>
          </ul>

          <h3>Evidence lanes</h3>
          <p>Each claim is labeled with the kind of evidence behind it:</p>
          <dl className="lane-legend">
            {laneOrder.map((lane) => (
              <div key={lane}>
                <dt>
                  <LaneLabel lane={lane} />
                </dt>
                <dd>{lanes[lane].meaning}</dd>
              </div>
            ))}
          </dl>
          <ul className="evidence-list">
            {evidence.map((item) => (
              <li key={item.claim}>
                <LaneLabel lane={item.lane} /> {item.claim}{" "}
                <ExternalLink href={item.evidence.href}>{item.evidence.label}</ExternalLink>
              </li>
            ))}
          </ul>
        </section>

        {/* 6. Failures and limits */}
        <section aria-labelledby="failures">
          <h2 id="failures">Failures and limits</h2>

          <h3>Q091: retrieval repaired, answer still incomplete</h3>
          <p>
            <LaneLabel lane="red" /> Q091 asks: “What approvals and security evidence do I need for a
            EUR 120,000 SaaS renewal?” The first retrieval pass finds the right policy but not the
            chunk that states the Band 3 approval threshold. The approval-gated second pass recovers
            it. In the one live run (gpt-4o, in the manual paid CI lane) the answer stated the
            threshold with a valid citation, but it dropped the renewal usage-data step that the
            expected answer requires. The evidence was in context; it was lost in generation over 19
            merged sources.
          </p>
          <p>
            The deterministic frozen regression still tracks Q091&apos;s term-level{" "}
            <code>Band 3</code> gap as a named, expected case. The failure is open and owned by
            generation, not retrieval. A valid citation and repaired retrieval do not make a
            complete answer, which is why Q091 is not an example question for the demo.{" "}
            <ExternalLink href={procureragLinks.whereItFails}>Where it still fails</ExternalLink>
          </p>

          <h3>The weakest slice</h3>
          <p>
            By query type, the reranker&apos;s weakest slice is <code>multi_doc</code>: P@1 0.600
            over 5 queries, against 0.978 overall, and the only slice where it loses to its own
            first stage (0.800).
          </p>

          <h3>Limits of what is built</h3>
          <ul>
            {limits.map((limit) => (
              <li key={limit.title}>
                <strong>{limit.title}.</strong> {limit.text}
              </li>
            ))}
          </ul>
        </section>

        {/*
          7. Demo. The text is server-rendered; the chat inside it is the one
          Client Component island. If the chat is offline, or JavaScript is
          off, nothing else on the page changes.
        */}
        <section aria-labelledby="demo">
          <h2 id="demo">Demo</h2>
          <div className="demo">
            <p className="status">Live demo: in progress</p>
            <p>
              <strong>The chat below is a local slice, not a hosted service.</strong> It answers only
              when this site runs next to a running ProcureRAG service. Nothing is hosted yet, so on
              any other copy of this page a question comes back as “Demo offline”.
            </p>
            <h3>What the chat does</h3>
            <ul>
              <li>
                It sends only your question text to this site&apos;s own server: no role, no approval
                decision, no other fields. That server calls ProcureRAG with a credential your
                browser never sees.
              </li>
              <li>
                It answers from the 24 Internal documents of the synthetic corpus, as a fixed
                “requester”, with no role picker and no approval controls.
              </li>
              <li>
                It says which state each result is in (for example answered, evidence missing,
                refused or demo offline) and cites document and chunk IDs only.
              </li>
              <li>It labels any question you type yourself as “evidence unchecked”.</li>
              <li>
                It keeps a visible history on the page only. The model does not remember earlier
                questions.
              </li>
            </ul>

            {/* Shown only when JavaScript is off, right where the greyed-out chat starts. */}
            <noscript>
              <p>The live demo needs JavaScript. Everything else on this page works without it.</p>
            </noscript>
            <ChatPanel />

            <p className="small">
              The four examples use Internal documents only and never need a reviewer&apos;s
              approval. Q091 is withheld because its live answer is a known failure; Q092 because it
              needs a Confidential document.
            </p>
            <p>
              You can run the same pipeline on your own machine today, with no API key (the model is
              off by default, so it returns retrieval results only):{" "}
              <ExternalLink href={procureragLinks.quickstart}>ProcureRAG quickstart</ExternalLink>
            </p>
          </div>
        </section>

        {/* 8. Reproduce it */}
        <section aria-labelledby="reproduce">
          <h2 id="reproduce">Reproduce it</h2>
          <p>
            Requires Python 3.11+ and <code>uv</code>. No credentials are needed; the first run
            downloads two Hugging Face models (about 106 MB).
          </p>
          <pre>
            <code>{`git clone https://github.com/juanfpinzon/ProcureRAG.git
cd ProcureRAG
uv sync --locked --dev

# ${measuredAt.testCount} tests at ${measuredAt.commit}
uv run pytest -q

# the retrieval table above
uv run python src/eval_metrics.py

# frozen cases; exit 1 on drift
uv run python src/regression_suite.py

# six graph-route contracts
uv run python src/graph_regression.py`}</code>
          </pre>
          <ul>
            <li>
              <ExternalLink href={procureragLinks.ciRun}>
                CI run for {measuredAt.commit} (three required checks)
              </ExternalLink>
            </li>
            <li>
              <ExternalLink href={procureragLinks.dockerRunbook}>Docker runbook</ExternalLink>
            </li>
            <li>
              <ExternalLink href={procureragLinks.azureRunbook}>
                Azure Container Apps runbook (historical; resources deleted)
              </ExternalLink>
            </li>
            <li>
              <ExternalLink href={procureragLinks.testQueries}>Manual and smoke test queries</ExternalLink>
            </li>
          </ul>
        </section>

        {/* 9. Roadmap */}
        <section aria-labelledby="roadmap">
          <h2 id="roadmap">Roadmap</h2>
          <p>
            <LaneLabel lane="notBuilt" /> Planned, in order. None of it exists yet.
          </p>
          <ol>
            {roadmap.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>
      </article>
    </div>
  );
}
