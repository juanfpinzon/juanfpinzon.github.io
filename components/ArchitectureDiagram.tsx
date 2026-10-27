/**
 * ProcureRAG request flow as an inline SVG, plus its visible text description.
 *
 * **Why inline SVG.** It is plain markup in the HTML, so it renders without
 * JavaScript, scales to any width, and its colours come from the same CSS
 * tokens as the page (it follows dark mode automatically). An image file of a
 * diagram would be an "image of text" (DESIGN §5 forbids those).
 *
 * **Why a text description is still required.** WCAG 1.1.1 needs a text
 * alternative for non-text content. At 320 px the diagram's labels shrink, and
 * a screen reader cannot follow boxes and arrows. So the same six steps are
 * also written out as an ordered list under the figure, visible to everyone.
 * The SVG's own accessible name points to that list.
 *
 * **How the drawing works.** `steps` below is the single source for both the
 * boxes and the list. Each box is drawn from the top down: its height depends
 * on how many detail lines it has, and an arrow joins it to the next box. SVG
 * text never wraps on its own, so every detail line is written to fit the box
 * (about 48 characters at this size).
 */

type Step = {
  title: string;
  /** Lines drawn inside the SVG box (short, pre-split). */
  lines: string[];
  /** The full sentence used in the visible text description. */
  description: string;
};

const steps: Step[] = [
  {
    title: "Caller",
    lines: ["HTTP POST /query, or the local MCP tool (stdio)"],
    description:
      "A caller sends one question: either an HTTP POST /query request or a call to the local MCP tool over stdio. Both use the same guarded service.",
  },
  {
    title: "1 · Service boundary (api.py)",
    lines: ["rate limit · schema, 500-character cap", "scope guard · role filter · injection block · PII"],
    description:
      "The service boundary checks the rate limit, the request schema and the 500-character cap, then applies the procurement scope guard, the requester/buyer role filter, a prompt-injection block and PII redaction, all before any retrieval runs.",
  },
  {
    title: "2 · Retrieval over 570 chunks",
    lines: ["BM25 + dense (MiniLM) → Reciprocal Rank Fusion", "→ cross-encoder rerank → context guard"],
    description:
      "Retrieval runs BM25 and dense MiniLM embeddings over 570 chunks, fuses them with Reciprocal Rank Fusion, reranks a 15-chunk shortlist with a cross-encoder, and a context guard withholds poisoned chunks.",
  },
  {
    title: "3 · LangGraph state graph",
    lines: ["diagnose evidence gaps, then: answer, take one", "approval-gated 2nd pass, or report the gap"],
    description:
      "A LangGraph state graph diagnoses evidence gaps and routes deterministically: answer directly, take one extra retrieval pass that needs a reviewer's approval, or report the gap instead of answering.",
  },
  {
    title: "4 · Generation + output guards",
    lines: ["numbered citations · uncited answers withheld", "PII redaction · live LLM off by default"],
    description:
      "Generation (an opt-in model call, off by default) must cite numbered sources; output guards withhold uncited answers and redact PII.",
  },
  {
    title: "QueryResponse",
    lines: ["status · text · source IDs only · guard findings"],
    description:
      "The response carries a status (one of six), the answer or gap text, source IDs only (no snippets) and the guard findings.",
  },
];

// Drawing constants, in SVG user units (the viewBox scales them to the screen).
const WIDTH = 400;
const BOX_X = 20;
const BOX_WIDTH = WIDTH - BOX_X * 2;
const PADDING = 14;
const TITLE_HEIGHT = 20;
const LINE_HEIGHT = 18;
const GAP = 30; // vertical space for the arrow between two boxes

/** Height of one box: padding, a title row, one row per detail line, padding. */
function boxHeight(step: Step) {
  return PADDING + TITLE_HEIGHT + step.lines.length * LINE_HEIGHT + PADDING - 4;
}

// Pre-compute each box's top edge so the JSX below only has to draw.
const layout = steps.reduce<{ y: number; step: Step }[]>((placed, step) => {
  const previous = placed.at(-1);
  const y = previous ? previous.y + boxHeight(previous.step) + GAP : 10;
  return [...placed, { y, step }];
}, []);

const last = layout[layout.length - 1];
const HEIGHT = last.y + boxHeight(last.step) + 10;

export function ArchitectureDiagram() {
  return (
    <figure>
      <svg
        className="diagram"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-labelledby="architecture-svg-title"
      >
        <title id="architecture-svg-title">
          ProcureRAG request flow in six steps. The same steps are described in the text below the
          diagram.
        </title>
        {layout.map(({ y, step }, index) => {
          const height = boxHeight(step);
          const isLast = index === layout.length - 1;
          const arrowTop = y + height;
          const arrowBottom = arrowTop + GAP;
          const centerX = WIDTH / 2;
          return (
            <g key={step.title}>
              <rect
                className="diagram__box"
                x={BOX_X}
                y={y}
                width={BOX_WIDTH}
                height={height}
                rx={8}
              />
              <text className="diagram__title" x={BOX_X + PADDING} y={y + PADDING + 12}>
                {step.title}
              </text>
              {step.lines.map((line, lineIndex) => (
                <text
                  key={line}
                  className="diagram__text"
                  x={BOX_X + PADDING}
                  y={y + PADDING + TITLE_HEIGHT + 12 + lineIndex * LINE_HEIGHT}
                >
                  {line}
                </text>
              ))}
              {/* Arrow to the next box: a vertical line and a small triangle. */}
              {isLast ? null : (
                <>
                  <line
                    className="diagram__arrow"
                    x1={centerX}
                    y1={arrowTop + 2}
                    x2={centerX}
                    y2={arrowBottom - 8}
                  />
                  <path
                    className="diagram__arrowhead"
                    d={`M ${centerX - 6} ${arrowBottom - 10} L ${centerX + 6} ${arrowBottom - 10} L ${centerX} ${arrowBottom - 1} Z`}
                  />
                </>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption>
        <p>
          <strong>Text description of the diagram.</strong> One request travels through six steps:
        </p>
        <ol>
          {steps.map((step) => (
            <li key={step.title}>{step.description}</li>
          ))}
        </ol>
      </figcaption>
    </figure>
  );
}
