import { lanes, type LaneId } from "@/content/procurerag";

/**
 * A small text badge naming an evidence lane: "Demonstrated",
 * "Demonstrated locally", "Historical · deleted", "Red · limited" or
 * "Not built yet".
 *
 * The lane is written in words first. The border colour (from the status
 * tokens in globals.css) is a second, redundant signal, so a visitor who
 * cannot tell the colours apart still reads the lane (WCAG 1.4.1, DESIGN §2:
 * "Colour is never the only signal"). The visually hidden colon makes a screen
 * reader say "Demonstrated: Retrieval ranking …" instead of running the badge
 * into the sentence.
 */
export function LaneLabel({ lane }: { lane: LaneId }) {
  return (
    <span className={`lane lane--${lane}`}>
      {lanes[lane].label}
      <span className="visually-hidden">:</span>
    </span>
  );
}
