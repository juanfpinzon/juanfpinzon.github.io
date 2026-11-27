import { outcomes, pipeline } from "@/content/procurerag";

/**
 * ProcureRAG's request path, condensed for the home page: five stages, then
 * the three ways a request can end.
 *
 * It is an ordered list, not a picture, so the text is real text: it reads
 * in order with a screen reader, wraps at any width and needs no separate
 * description. CSS turns it into a horizontal track from 1024 px and a
 * vertical one below.
 *
 * The travelling pulse along the track is decorative (`aria-hidden`) and a
 * CSS animation only. Under `prefers-reduced-motion: reduce` it does not run,
 * and nothing in the list depends on it.
 */
export function Pipeline() {
  return (
    <div className="pipeline">
      <h3 id="pipeline-title" className="pipeline__title">
        How a question travels
      </h3>
      <div className="pipeline__rail">
      <span className="pipeline__pulse" aria-hidden="true" />
      <ol className="pipeline__track" aria-labelledby="pipeline-title">
        {pipeline.map((stage, index) => (
          <li key={stage.step} className="pipeline__stage">
            <span className="pipeline__index" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="pipeline__step">{stage.step}</span>
            <span className="pipeline__detail">{stage.detail}</span>
          </li>
        ))}
        <li className="pipeline__stage pipeline__stage--outcomes">
          <span className="pipeline__index" aria-hidden="true">
            →
          </span>
          <span className="pipeline__step">Ends as one of</span>
          <ul className="pipeline__outcomes">
            {outcomes.map((outcome) => (
              <li key={outcome.label} className={`outcome outcome--${outcome.tone}`}>
                {outcome.label}
              </li>
            ))}
          </ul>
        </li>
      </ol>
      </div>
    </div>
  );
}
