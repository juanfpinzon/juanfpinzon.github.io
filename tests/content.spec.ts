import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { FORBIDDEN, ROUTES } from "./routes";

/*
 * Content accuracy: the high-risk claims from the Day 26 inventory must appear
 * exactly, the known over-claims must never appear, and the important links
 * must point where they should.
 *
 * These tests read the VISIBLE text of the rendered production page
 * (`innerText`), so text hidden from sighted users does not count as "shown".
 * They prove the wording is present or absent. They cannot prove the wording is
 * true: that comes from the inventory and the ProcureRAG evidence.
 */

async function visibleText(page: Page, route: string) {
  await page.goto(route);
  return page.locator("body").innerText();
}

/** Exact strings each route must show (inventory §1–§4, §7). */
const REQUIRED: Record<(typeof ROUTES)[number], string[]> = {
  "/": [
    "ML/AI engineer with production forecasting and procurement experience, building evidence-driven RAG and agentic applications.",
    "Working in ML and data science since 2019. Production forecasting at PepsiCo since 2022",
    "Barcelona",
    "Data Product Management Associate Manager",
    "Data Science Sr. Analyst",
    "Machine Learning Researcher / DL Consultant",
    "synthetic",
    "independent learning project",
    "P@1 0.978 retrieval ranking (93 queries)",
    "430+ tests",
    "Live demo: in progress",
    "Procesamiento del Lenguaje Natural 65 (2020)",
    "545 CVs with NER annotations (as documented in the dataset README)",
    "AGI 2022 proceedings (published 2023)",
    "David T. Chen (NIAID)",
    "not a deployed clinical product",
    "Boot.dev — Learn Retrieval Augmented Generation",
    "Hugging Face — The MCP Course, Unit 1: Fundamentals of MCP",
  ],
  "/procurerag": [
    "Independent learning project · synthetic data · not affiliated with any employer",
    "Vantera",
    "93 labeled queries",
    "retrieval ranking—not answer accuracy",
    "452 automated tests passed on 2026-10-26 at commit edf76f5",
    "Q091",
    // The frozen regression's named gap, not just any mention of "Band 3".
    "tracks Q091's term-level Band 3 gap as a named, expected case",
    "Historical · deleted",
    "Not built yet",
    "Red · limited",
    "Live demo: in progress",
    "Nothing on this page sends a question anywhere.",
    "What approval is required for a EUR 60,000 purchase order?",
    "What do I have to document after an emergency purchase, and by when?",
    "Are facilitation payments ever allowed?",
    "What does GRNI mean?",
  ],
  "/about": [
    "Data Product Management Associate Manager — PepsiCo",
    "Data Science Sr. Analyst — PepsiCo",
    "Machine Learning Researcher / DL Consultant — Novel Software Systems",
    "Procurement & Inventory Analyst — STF Group",
    "M.Sc. Big Data Analytics & AI",
    "Procesamiento del Lenguaje Natural 65 (2020)",
    "AGI 2022 proceedings (published 2023)",
    "Unit 1: Fundamentals of MCP",
    "credited upstream",
  ],
};


for (const route of ROUTES) {
  test(`${route} shows the required claims`, async ({ page }) => {
    const text = await visibleText(page, route);
    for (const phrase of REQUIRED[route]) {
      expect(text, `missing on ${route}: "${phrase}"`).toContain(phrase);
    }
  });

  test(`${route} has none of the forbidden claims`, async ({ page }) => {
    const text = await visibleText(page, route);
    for (const { pattern, why } of FORBIDDEN) {
      expect(text, `${route} matches ${pattern} (${why})`).not.toMatch(pattern);
    }
  });
}

test("ProcureRAG is kept separate from every employer", async ({ page }) => {
  // The case study and the home flagship card describe an independent
  // project, so neither may name an employer at all (inventory §2.1), and the
  // card must carry the explicit separation sentence.
  const caseStudy = await visibleText(page, "/procurerag");
  expect(caseStudy).not.toMatch(/PepsiCo/);

  await page.goto("/");
  const flagship = page.locator('section[aria-labelledby="flagship-title"]');
  await expect(flagship).not.toContainText("PepsiCo");
  await expect(flagship).toContainText("no employer data, systems, affiliation or endorsement");
});

/** Links that must exist with these exact destinations (checked on 2026-10-26). */
const REQUIRED_LINKS: Record<(typeof ROUTES)[number], string[]> = {
  "/": [
    "/procurerag",
    "/cv.pdf",
    "https://www.linkedin.com/in/juanfpinzon/",
    "mailto:juancho704@gmail.com",
    "https://github.com/juanfpinzon",
    "https://github.com/juanfpinzon/ProcureRAG",
    // The journal's HTTPS certificate is broken, so the paper link is HTTP.
    "http://journal.sepln.org/sepln/ojs/ojs/index.php/pln/article/view/6276",
    "https://github.com/juanfpinzon/resume-dataset",
    "https://doi.org/10.1007/978-3-031-19907-3_4",
    "https://arxiv.org/abs/2204.12928",
    "https://github.com/juanfpinzon/dicom2stl",
    "https://github.com/dave3d/dicom2stl",
    "https://github.com/juanfpinzon/CS231n-self-paced",
  ],
  "/procurerag": [
    "https://github.com/juanfpinzon/ProcureRAG",
    "https://github.com/juanfpinzon/ProcureRAG/blob/main/docs/eval-report.md",
    "https://github.com/juanfpinzon/ProcureRAG/actions/runs/40401385508",
    "https://github.com/juanfpinzon/ProcureRAG/commit/edf76f5266963341096876f1ebb11ff23894af3f",
    "https://github.com/juanfpinzon/ProcureRAG/blob/main/docs/azure-container-apps-runbook.md",
  ],
  "/about": [
    "/cv.pdf",
    "mailto:juancho704@gmail.com",
    "https://www.linkedin.com/in/juanfpinzon/",
    "https://doi.org/10.1007/978-3-031-19907-3_4",
  ],
};

for (const route of ROUTES) {
  test(`${route} links to the expected destinations`, async ({ page }) => {
    await page.goto(route);
    for (const href of REQUIRED_LINKS[route]) {
      await expect(page.locator(`a[href="${href}"]`).first(), `no link to ${href}`).toBeAttached();
    }
  });
}

test("header navigation reaches every route", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });

  await nav.getByRole("link", { name: "ProcureRAG" }).click();
  await expect(page).toHaveURL(/\/procurerag$/);
  await expect(page.locator("h1")).toContainText("ProcureRAG");

  await nav.getByRole("link", { name: "About" }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.locator("h1")).toContainText("About");

  await page.getByRole("link", { name: "Juan F. Pinzon" }).first().click();
  await expect(page).toHaveURL(/\/$/);

  await expect(nav.getByRole("link", { name: /CV/ })).toHaveAttribute("href", "/cv.pdf");
});

test("/cv.pdf serves the corrected October 2026 CV, byte for byte", async ({ request }) => {
  const response = await request.get("/cv.pdf");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/pdf");

  // public/cv.pdf is a copy; the source of truth is the tagged PDF in docs/.
  const expected = readFileSync("docs/JuanFernandoPinzon_CV_Oct2026.pdf");
  expect(Buffer.compare(await response.body(), expected)).toBe(0);
});

test("every internal link and in-page anchor resolves", async ({ page, request }) => {
  for (const route of ROUTES) {
    await page.goto(route);
    const hrefs = await page
      .locator("a[href]")
      .evaluateAll((anchors) => anchors.map((a) => a.getAttribute("href") ?? ""));

    for (const href of hrefs.filter((h) => h.startsWith("/") || h.startsWith("#"))) {
      // "#id" is relative to the current route; "/path#id" names its route.
      const [path, hash] = href.startsWith("#") ? [route, href.slice(1)] : href.split("#");
      const response = await request.get(path || "/");
      expect(response.status(), `${route} → ${href}`).toBe(200);

      if (hash) {
        const html = await response.text();
        expect(html, `${route} → ${href}: no element with id="${hash}"`).toContain(`id="${hash}"`);
      }
    }
  }
});
