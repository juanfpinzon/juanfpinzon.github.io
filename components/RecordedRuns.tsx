import { launchSmoke, procureragLinks, recordedRuns } from "@/content/procurerag";
import { ExternalLink } from "./ExternalLink";

const TONE_ICONS = { ok: "✓", warn: "!", danger: "×" } as const;

/**
 * "How it behaves": five recorded runs from the paid launch smoke on the
 * deployed chain (content/procurerag.ts → `recordedRuns`).
 *
 * This is the home page's stand-in for the live chat while the hosted chat
 * is switched off. It shows real outcomes, not a simulation: each row is the
 * state, time and cited IDs the smoke script recorded, plus the manual
 * verdict. The known failure (Q091) is one of the rows.
 *
 * Every state is written in words; the coloured edge and icon repeat it
 * (colour is never the only signal). The icon is decorative.
 */
export function RecordedRuns() {
  return (
    <div className="runs">
      <div className="runs__head">
        <h3 id="runs-title">How it behaves</h3>
        <p>
          Five of the questions from the launch smoke test on the deployed chain (Vercel → Azure
          Container Apps), {launchSmoke.date}. State, time and cited IDs are the script&apos;s
          output; the verdicts are my review.
        </p>
      </div>
      <ol className="runs__list" aria-labelledby="runs-title">
        {recordedRuns.map((run) => (
          <li key={run.id} className={`run run--${run.tone}`}>
            <p className="run__state">
              <span className="run__icon" aria-hidden="true">
                {TONE_ICONS[run.tone]}
              </span>
              {run.state}
            </p>
            <div className="run__body">
              <p className="run__question">
                {run.quoted ? (
                  <>
                    <span className="run__id">{run.id}</span> “{run.question}”
                  </>
                ) : (
                  run.question
                )}
              </p>
              <p className="run__verdict">{run.verdict}</p>
            </div>
            <p className="run__meta">
              <span>{run.time}</span>
              <span>{run.detail}</span>
            </p>
          </li>
        ))}
      </ol>
      <p className="runs__foot">
        {launchSmoke.questions} questions, {launchSmoke.modelCalls} model calls,{" "}
        {launchSmoke.cost} in total.{" "}
        <ExternalLink href={procureragLinks.launchSmoke}>Launch smoke record</ExternalLink>
      </p>
    </div>
  );
}
