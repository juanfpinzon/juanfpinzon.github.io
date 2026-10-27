import { expect, test, type Page } from "@playwright/test";
import { presets } from "@/content/procurerag";
import { UI_MESSAGES, type BrowserView, type UiState } from "@/lib/chat/contract";

/*
 * The chat island (components/ChatPanel.tsx) in a real browser, against the
 * production build.
 *
 * Most tests replace the BFF's answer with `page.route`: Playwright intercepts
 * the browser's request to /api/chat and fulfils it with a chosen
 * `BrowserView`. That isolates the UI: each of the ten states can be shown on
 * demand, and the test can read exactly what the browser sent. The BFF itself
 * is tested in chat-bff.spec.ts (logic) and chat-route.spec.ts (built route).
 *
 * One test uses no mock at all: browser -> real /api/chat -> refused upstream.
 */

const Q001 = presets[0];
const Q091_TEXT = "What approvals and security evidence do I need for a EUR 120,000 SaaS renewal?";

/** The label each state must show (DESIGN §6), written here independently of the component. */
const EXPECTED_LABELS: Record<UiState, string> = {
  answered: "Answer",
  model_declined: "Model declined",
  gap_report: "Evidence missing",
  not_generated: "Retrieval only",
  blocked: "Refused",
  pending_approval: "Needs a reviewer",
  invalid_question: "Check your question",
  busy: "Demo limit reached",
  timed_out: "Took too long",
  unavailable: "Demo offline",
};

/** The HTTP status the real BFF uses for each state (ADR §6.3). */
const HTTP_STATUS: Record<UiState, number> = {
  answered: 200,
  model_declined: 200,
  gap_report: 200,
  not_generated: 200,
  blocked: 200,
  pending_approval: 200,
  invalid_question: 422,
  busy: 429,
  timed_out: 504,
  unavailable: 503,
};

function view(state: UiState, fields: Partial<BrowserView> = {}): BrowserView {
  return {
    state,
    message: UI_MESSAGES[state],
    text: null,
    sources: [],
    caveats: [],
    guards: [],
    retry_after_seconds: null,
    ...fields,
  };
}

/** Answer every /api/chat request with `reply`; returns the JSON bodies the browser sent. */
async function mockChat(page: Page, reply: BrowserView, delayMs = 0) {
  const sent: unknown[] = [];
  await page.route("**/api/chat", async (route) => {
    sent.push(route.request().postDataJSON());
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.fulfill({ status: HTTP_STATUS[reply.state], json: reply });
  });
  return sent;
}

const questionBox = (page: Page) => page.getByRole("textbox", { name: "Your question" });
const askButton = (page: Page) => page.getByRole("button", { name: "Ask" });
const answers = (page: Page) => page.locator(".chat__history article");

async function ask(page: Page, question: string) {
  await questionBox(page).fill(question);
  await askButton(page).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/procurerag");
  // The controls are disabled until React has hydrated the island.
  await expect(askButton(page)).toBeEnabled();
});

test("exactly four preset buttons with the approved texts; Q091 and Q092 are never offered", async ({ page }) => {
  const buttons = page.locator(".chat__presets button");
  await expect(buttons).toHaveCount(4);
  for (const [index, preset] of presets.entries()) {
    await expect(buttons.nth(index)).toHaveText(`${preset.id} ${preset.text}`);
  }
  await expect(page.getByRole("button", { name: /Q091|Q092|SaaS renewal/ })).toHaveCount(0);
});

test("a preset fills the box as an example; one edit makes it free text", async ({ page }) => {
  await page.getByRole("button", { name: new RegExp(Q001.id) }).click();

  await expect(questionBox(page)).toHaveValue(Q001.text);
  await expect(questionBox(page)).toBeFocused();
  await expect(page.locator("#chat-question-count")).toContainText("example Q001");

  await questionBox(page).press("End");
  await questionBox(page).pressSequentially(" ");
  await expect(page.locator("#chat-question-count")).toContainText("free text: no evaluation labels");
});

test("the browser sends exactly {question} and nothing else", async ({ page }) => {
  const sent = await mockChat(page, view("not_generated"));

  await page.getByRole("button", { name: new RegExp(Q001.id) }).click();
  await askButton(page).click();
  await expect(answers(page)).toHaveCount(1);

  expect(sent).toEqual([{ question: Q001.text }]);
});

test.describe("one visible treatment per state", () => {
  const SOURCES = [
    { source_id: 1, doc_id: "POL-001", chunk_id: "POL-001::chunk-6", cited: false },
    { source_id: 2, doc_id: "FAQ-001", chunk_id: "FAQ-001::chunk-2", cited: true },
  ];
  const examples: Record<UiState, Partial<BrowserView>> = {
    answered: { text: "Procurement Manager approval [2].", sources: SOURCES, caveats: ["evidence unchecked"] },
    model_declined: { text: "The sources do not say.", sources: SOURCES.slice(0, 1) },
    gap_report: { text: "Not answered: POL-001 is missing." },
    not_generated: { sources: SOURCES },
    blocked: { text: "Blocked by the input guard.", guards: ["prompt_injection"] },
    pending_approval: {},
    invalid_question: {},
    busy: { retry_after_seconds: 40 },
    timed_out: {},
    unavailable: {},
  };

  for (const state of Object.keys(examples) as UiState[]) {
    test(state, async ({ page }) => {
      await mockChat(page, view(state, examples[state]));
      await ask(page, "What does GRNI mean?");

      const answer = answers(page).last();
      await expect(answer.getByRole("heading", { level: 4 })).toHaveText(new RegExp(`${EXPECTED_LABELS[state]}$`));
      await expect(answer).toContainText(UI_MESSAGES[state]);
      // A public visitor is never offered an approval path, in any state.
      await expect(page.getByRole("button", { name: /approve|reject|edit/i })).toHaveCount(0);

      if (state === "answered") {
        await expect(answer).toContainText("Procurement Manager approval [2].");
        // Cited sources first, then the rest; IDs only.
        await expect(answer.locator(".chat-sources li")).toHaveText([
          "[2] FAQ-001 · FAQ-001::chunk-2 · cited",
          "[1] POL-001 · POL-001::chunk-6 · not cited",
        ]);
        await expect(answer).toContainText("evidence unchecked");
      }
      if (state === "not_generated") await expect(answer).toContainText("Sources an answer would use");
      if (state === "blocked") await expect(answer).toContainText("Guards that fired: prompt_injection");
      if (state === "busy") await expect(answer).toContainText("You can ask again in about 40 seconds.");
      if (state === "unavailable") {
        await expect(answer.getByRole("link", { name: /ProcureRAG code on GitHub/ })).toBeVisible();
      }
    });
  }
});

test("while waiting: the button says so and is disabled, the live region announces, then focus moves to the result", async ({
  page,
}) => {
  await mockChat(page, view("not_generated"), 800);
  const status = page.getByRole("status");

  await ask(page, "What does GRNI mean?");

  await expect(page.getByRole("button", { name: "Waiting for the service…" })).toBeDisabled();
  await expect(status).toContainText("Waiting for the service…");

  const heading = answers(page).last().getByRole("heading", { level: 4 });
  await expect(heading).toBeFocused();
  await expect(status).toContainText(`Retrieval only. ${UI_MESSAGES.not_generated}`);
  await expect(askButton(page)).toBeEnabled();
});

test("keyboard only: a preset, then Enter, sends the question; Shift+Enter only adds a line", async ({ page }) => {
  const sent = await mockChat(page, view("not_generated"));

  // Shift+Enter: a new line, nothing sent.
  await questionBox(page).focus();
  await page.keyboard.type("What does");
  await page.keyboard.press("Shift+Enter");
  await page.keyboard.type("GRNI mean?");
  await expect(questionBox(page)).toHaveValue("What does\nGRNI mean?");
  expect(sent).toEqual([]);

  // A preset reached with Tab, chosen with Enter, then sent with Enter.
  const firstPreset = page.locator(".chat__presets button").first();
  await firstPreset.focus();
  await page.keyboard.press("Enter");
  await expect(questionBox(page)).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(answers(page).last().getByRole("heading", { level: 4 })).toBeFocused();
  expect(sent).toEqual([{ question: Q001.text }]);
});

test("input errors are tied to the box, move focus to it, and send nothing", async ({ page }) => {
  const sent = await mockChat(page, view("not_generated"));
  const box = questionBox(page);

  await askButton(page).click();
  await expect(page.locator("#chat-question-error")).toHaveText("Type a question, or choose an example above.");
  await expect(box).toHaveAttribute("aria-invalid", "true");
  await expect(box).toHaveAttribute("aria-describedby", /chat-question-error/);
  await expect(box).toBeFocused();

  await ask(page, "a".repeat(501));
  await expect(page.locator("#chat-question-error")).toContainText("at most 500 characters (this one has 501)");
  expect(sent).toEqual([]);
});

test("the history keeps every answer on the page and says it is not model memory", async ({ page }) => {
  await mockChat(page, view("not_generated"));

  await ask(page, "What does GRNI mean?");
  await ask(page, Q091_TEXT);

  await expect(answers(page)).toHaveCount(2);
  await expect(answers(page).last()).toContainText("(free text, evidence unchecked)");
  await expect(page.getByText("the model never sees earlier questions")).toBeVisible();
});

test("no mock: browser -> real /api/chat -> refused upstream ends as Demo offline", async ({ page }) => {
  await page.getByRole("button", { name: new RegExp(Q001.id) }).click();
  await askButton(page).click();

  const answer = answers(page).last();
  await expect(answer.getByRole("heading", { level: 4 })).toHaveText(/Demo offline$/);
  await expect(answer).toContainText(UI_MESSAGES.unavailable);
  // The case study around the chat is untouched.
  await expect(page.getByRole("heading", { level: 2, name: "Evidence" })).toBeVisible();
});

test("preset buttons and Ask are at least 44 px tall, and a keyboard focus ring shows", async ({ page }) => {
  for (const target of [...(await page.locator(".chat__presets button").all()), askButton(page)]) {
    const box = await target.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  await questionBox(page).focus();
  await page.keyboard.press("Shift+Tab"); // back to the last preset button, by keyboard
  const ring = await page.locator(".chat__presets button").last().evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(ring).toBe("solid");
});

test("no page-level horizontal scroll at 320 px with long answers and IDs", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  const longId = `GUIDE-005::chunk-${"9".repeat(40)}`;
  await mockChat(
    page,
    view("answered", {
      text: `${"Procurement-Manager-approval-is-required-".repeat(5)} [1].`,
      sources: [{ source_id: 1, doc_id: "GUIDE-005", chunk_id: longId, cited: true }],
    }),
  );

  await ask(page, "What does GRNI mean?");
  await expect(answers(page)).toHaveCount(1);

  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

test("a successful exchange logs no console error", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await mockChat(page, view("not_generated"));

  await ask(page, "What does GRNI mean?");
  await expect(answers(page)).toHaveCount(1);

  expect(errors).toEqual([]);
});
