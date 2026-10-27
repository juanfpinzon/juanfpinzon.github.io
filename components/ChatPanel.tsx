"use client";

/*
 * The procurement chat: the ONLY Client Component on /procurerag.
 *
 * "use client" marks the boundary: this file, and what it imports, is sent to
 * the browser as JavaScript so it can react to typing and clicks. The rest of
 * the case study stays a Server Component, rendered to plain HTML at build
 * time, which is why it still reads fully with JavaScript turned off.
 *
 * Everything this file imports must be safe to publish to every visitor:
 * - lib/chat/contract.ts: limits, state names and fixed messages;
 * - content/procurerag.ts: the preset questions and public links.
 * It never imports lib/chat/bff.ts or app/api/chat/route.ts, which hold the
 * server logic and read the credential.
 *
 * What it does:
 * 1. the visitor types a question, or clicks one of the four preset buttons
 *    (which fills the text area, so it can still be edited);
 * 2. "Ask" sends `{"question": "..."}` and nothing else to the same-origin
 *    BFF at /api/chat. The browser never knows the ProcureRAG API's address;
 * 3. the reply (a `BrowserView`) is added to the visible history, with one
 *    clear label per state.
 *
 * The history is a list in this component's memory. It is NOT model memory:
 * every question is sent on its own, and a reload empties the list.
 */

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type KeyboardEvent,
  type Ref,
} from "react";
import { ExternalLink } from "@/components/ExternalLink";
import { presets, procureragLinks } from "@/content/procurerag";
import {
  MAX_QUESTION_CHARS,
  UI_STATES,
  countCharacters,
  presetIdFor,
  transportView,
  type BrowserView,
  type UiState,
} from "@/lib/chat/contract";

/**
 * The browser gives up after 105 s (ADR §8.4): a little longer than the BFF's
 * own 75 s upstream timeout and its 100 s function limit, so the BFF's typed
 * `timed_out` answer normally arrives first. There is no automatic retry.
 */
const BROWSER_TIMEOUT_MS = 105_000;

type Tone = "ok" | "warn" | "danger" | "neutral";

/**
 * One visible label per state (DESIGN §6). The colour comes from the tone, but
 * the label TEXT alone says what happened: colour is never the only signal.
 * The icon is decorative (hidden from screen readers), so it is not read out
 * twice next to the label.
 */
const STATE_LABELS: Record<UiState, { label: string; tone: Tone }> = {
  answered: { label: "Answer", tone: "ok" },
  model_declined: { label: "Model declined", tone: "warn" },
  gap_report: { label: "Evidence missing", tone: "warn" },
  not_generated: { label: "Retrieval only", tone: "neutral" },
  blocked: { label: "Refused", tone: "danger" },
  pending_approval: { label: "Needs a reviewer", tone: "neutral" },
  invalid_question: { label: "Check your question", tone: "warn" },
  busy: { label: "Demo limit reached", tone: "warn" },
  timed_out: { label: "Took too long", tone: "warn" },
  unavailable: { label: "Demo offline", tone: "danger" },
};

const TONE_ICONS: Record<Tone, string> = { ok: "✓", warn: "!", danger: "×", neutral: "i" };

/** One question and its answer, as shown in the page-local history. */
type Turn = { id: number; question: string; presetId: string | null; view: BrowserView };

// ---------------------------------------------------------------------------
// Talking to the BFF.
// ---------------------------------------------------------------------------

/**
 * A light check of the BFF's reply. Our own BFF wrote it, but something else
 * can answer instead, e.g. a hosting platform's error page. This is enough
 * because React escapes every string it renders, so a bad string cannot
 * inject markup; the full validation of the UNTRUSTED upstream already
 * happened on the server.
 */
function isBrowserView(data: unknown): data is BrowserView {
  if (typeof data !== "object" || data === null) return false;
  const view = data as Partial<BrowserView>;
  return (
    UI_STATES.includes(view.state as UiState) &&
    typeof view.message === "string" &&
    Array.isArray(view.sources) &&
    Array.isArray(view.caveats) &&
    Array.isArray(view.guards)
  );
}

/** Send one question to the same-origin BFF. Always resolves to a view; never throws. */
async function askBff(question: string): Promise<BrowserView> {
  let response: Response;
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
      signal: AbortSignal.timeout(BROWSER_TIMEOUT_MS),
    });
  } catch (error) {
    // Our own 105 s limit fired, or the browser is offline.
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return transportView(timedOut ? "timed_out" : "unavailable");
  }
  try {
    const data: unknown = await response.json();
    if (isBrowserView(data)) return data;
  } catch {
    // Not JSON: e.g. a platform's own error page.
  }
  return transportView(response.status === 504 ? "timed_out" : "unavailable");
}

// ---------------------------------------------------------------------------
// Rendering one result.
// ---------------------------------------------------------------------------

function TurnResult({ turn, headingRef }: { turn: Turn; headingRef?: Ref<HTMLHeadingElement> }) {
  const { view } = turn;
  const { label, tone } = STATE_LABELS[view.state];
  // Cited sources first (DESIGN §6), then in their API order.
  const sources = [...view.sources].sort(
    (a, b) => Number(b.cited) - Number(a.cited) || a.source_id - b.source_id,
  );

  return (
    <article className={`chat-turn chat-turn--${tone}`} aria-labelledby={`turn-${turn.id}-state`}>
      <p className="chat-turn__question">
        <span className="visually-hidden">You asked: </span>“{turn.question}”{" "}
        <span className="small muted">
          {turn.presetId ? (
            <>
              (example <code>{turn.presetId}</code>)
            </>
          ) : (
            "(free text, evidence unchecked)"
          )}
        </span>
      </p>

      {/* tabIndex -1: focus can be moved here by script (after each answer), but Tab skips it. */}
      <h4 id={`turn-${turn.id}-state`} className="chat-turn__state" tabIndex={-1} ref={headingRef}>
        <span className="chat-turn__icon" aria-hidden="true">
          {TONE_ICONS[tone]}
        </span>
        {label}
      </h4>
      <p>{view.message}</p>

      {view.text !== null && <p className="chat-turn__text">{view.text}</p>}

      {view.retry_after_seconds !== null && (
        <p>You can ask again in about {view.retry_after_seconds} seconds.</p>
      )}

      {view.guards.length > 0 && (
        <p className="small">
          Guards that fired:{" "}
          {view.guards.map((guard, index) => (
            <span key={`${guard}-${index}`}>
              {index > 0 && ", "}
              <code>{guard}</code>
            </span>
          ))}
        </p>
      )}

      {view.caveats.length > 0 && (
        <>
          <p className="small chat-turn__label">Caveats</p>
          <ul className="small">
            {view.caveats.map((caveat, index) => (
              <li key={index}>{caveat}</li>
            ))}
          </ul>
        </>
      )}

      {sources.length > 0 && (
        <>
          <p className="small chat-turn__label">
            {view.state === "not_generated" ? "Sources an answer would use" : "Sources"} (document and
            chunk IDs)
          </p>
          <ul className="chat-sources small">
            {sources.map((source) => (
              <li key={source.source_id}>
                <code>[{source.source_id}]</code> <code>{source.doc_id}</code> ·{" "}
                <code>{source.chunk_id}</code> ·{" "}
                {source.cited ? <strong>cited</strong> : <span className="muted">not cited</span>}
              </li>
            ))}
          </ul>
        </>
      )}

      {view.state === "unavailable" && (
        <p className="small">
          <a href="#reproduce">Run it on your own machine</a> ·{" "}
          <ExternalLink href={procureragLinks.repo}>ProcureRAG code on GitHub</ExternalLink>
        </p>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// The chat.
// ---------------------------------------------------------------------------

/**
 * True once React runs in the browser; false during the server render (and in
 * the HTML a visitor without JavaScript keeps). `useSyncExternalStore` takes a
 * separate snapshot for the server and for the client, which is exactly that
 * difference, without a state update in an effect.
 */
const subscribeToNothing = () => () => {};
function useIsHydrated(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}

export function ChatPanel() {
  const hydrated = useIsHydrated();
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [history, setHistory] = useState<Turn[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const newestHeadingRef = useRef<HTMLHeadingElement>(null);
  const nextTurnId = useRef(1);

  const characters = countCharacters(question);
  const presetId = presetIdFor(question);

  // After each new answer, move keyboard focus to its heading, so a keyboard or
  // screen-reader user lands on the result. Focus is moved only here and after
  // an input error, never trapped.
  useEffect(() => {
    if (history.length > 0) newestHeadingRef.current?.focus();
  }, [history.length]);

  function choosePreset(text: string) {
    setQuestion(text);
    setInputError(null);
    textareaRef.current?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    // The same rules the BFF enforces, checked first here so the visitor gets
    // a precise message without a request. The BFF still checks everything:
    // anything in the browser can be bypassed.
    if (question.trim() === "") {
      setInputError("Type a question, or choose an example above.");
      textareaRef.current?.focus();
      return;
    }
    if (characters > MAX_QUESTION_CHARS) {
      setInputError(`Use at most ${MAX_QUESTION_CHARS} characters (this one has ${characters}).`);
      textareaRef.current?.focus();
      return;
    }

    const asked = question;
    setInputError(null);
    setPending(true);
    setStatus("Waiting for the service… If it was idle, it can take about a minute to wake up.");

    const view = await askBff(asked);

    const id = nextTurnId.current;
    nextTurnId.current += 1;
    setHistory((turns) => [...turns, { id, question: asked, presetId: presetIdFor(asked), view }]);
    setPending(false);
    setStatus(`${STATE_LABELS[view.state].label}. ${view.message}`);
  }

  // Enter sends the question (DESIGN §5); Shift+Enter starts a new line. A key
  // press during IME composition (e.g. typing Japanese) is not a send.
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  const describedBy = ["chat-question-hint", "chat-question-count", inputError ? "chat-question-error" : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="chat">
      <h3>Ask a question</h3>
      <p className="chat__disclosure">
        Questions are answered from a synthetic procurement knowledge base. When answers are
        generated, your question and the retrieved excerpts are sent through OpenRouter to a
        zero-data-retention model endpoint (today, Microsoft Azure), which does not store them.{" "}
        <strong>Do not enter personal or confidential information.</strong>
      </p>

      <form onSubmit={submit} aria-label="Procurement question">
        {/*
          Disabled until React runs in the browser. Without JavaScript the form
          could still be submitted natively, which would reload this page with
          the question in the URL. The <noscript> note below explains why the
          controls are greyed out.
        */}
        <fieldset className="chat__fieldset" disabled={!hydrated}>
          <p className="chat__label" id="chat-presets-label">
            Example questions
          </p>
          <ul className="chat__presets" aria-labelledby="chat-presets-label">
            {presets.map((preset) => (
              <li key={preset.id}>
                <button type="button" className="chat__preset" onClick={() => choosePreset(preset.text)}>
                  <code>{preset.id}</code> {preset.text}
                </button>
              </li>
            ))}
          </ul>

          <label className="chat__label" htmlFor="chat-question">
            Your question
          </label>
          <p id="chat-question-hint" className="small muted">
            1–{MAX_QUESTION_CHARS} characters about procurement policy. Enter sends; Shift+Enter
            adds a line.
          </p>
          <textarea
            id="chat-question"
            ref={textareaRef}
            value={question}
            rows={3}
            aria-describedby={describedBy}
            aria-invalid={inputError !== null}
            onChange={(event) => {
              setQuestion(event.target.value);
              if (inputError) setInputError(null);
            }}
            onKeyDown={onKeyDown}
          />
          {/* Not a live region: a screen reader reads it with the field, not on every keystroke. */}
          <p
            id="chat-question-count"
            className={`small ${characters > MAX_QUESTION_CHARS ? "chat__count--over" : "muted"}`}
          >
            {characters}/{MAX_QUESTION_CHARS} characters
            {question.trim() !== "" &&
              (presetId
                ? ` · example ${presetId}: sent with its evaluation id, so missing evidence can be detected`
                : " · free text: no evaluation labels, so the evidence is unchecked")}
          </p>
          {inputError && (
            <p id="chat-question-error" className="chat__error">
              {inputError}
            </p>
          )}

          <button type="submit" className="button" disabled={pending}>
            {pending ? "Waiting for the service…" : "Ask"}
          </button>
        </fieldset>
      </form>

      {/*
        The one live region (DESIGN §5): it is in the page from the start, and
        only its text changes, so screen readers announce "waiting" and then the
        result's label. role="status" is a polite live region: it waits for the
        reader to finish what it is saying.
      */}
      <p className="chat__status small" role="status">
        {status}
      </p>

      {history.length > 0 && (
        <>
          <h3 id="chat-history-title">Answers on this page</h3>
          <p className="small muted">
            Each question is sent on its own: the model never sees earlier questions. This list
            lives only in this browser tab and is gone when you reload.
          </p>
          <ol className="chat__history" aria-labelledby="chat-history-title">
            {history.map((turn, index) => (
              <li key={turn.id}>
                <TurnResult turn={turn} headingRef={index === history.length - 1 ? newestHeadingRef : undefined} />
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
