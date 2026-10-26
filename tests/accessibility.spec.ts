import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { ROUTES, VIEWPORT_WIDTHS } from "./routes";

/*
 * Structure, keyboard, focus, reflow, motion and no-JavaScript behaviour.
 *
 * These are measured behaviours from the WCAG 2.2 contract in DESIGN §5, not
 * an accessibility score. What they do NOT prove: that a screen reader
 * announces everything sensibly, that the copy is clear, or that real browser
 * zoom behaves like a 320 px viewport. Those stay manual checks.
 */

for (const route of ROUTES) {
  test.describe(`page structure: ${route}`, () => {
    test("renders with lang=en, one h1 and the four landmarks", async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);

      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(page.locator("h1")).toHaveCount(1);
      // Landmarks by ARIA role: <header> = banner, <main> = main,
      // <footer> = contentinfo (only at the top level of the page).
      await expect(page.getByRole("banner")).toHaveCount(1);
      await expect(page.getByRole("main")).toHaveCount(1);
      await expect(page.getByRole("contentinfo")).toHaveCount(1);
      await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
    });

    test("heading levels start at h1 and never skip a level", async ({ page }) => {
      await page.goto(route);
      const levels = await page
        .locator("h1, h2, h3, h4, h5, h6")
        .evaluateAll((headings) => headings.map((h) => Number(h.tagName.slice(1))));

      expect(levels[0]).toBe(1);
      for (let i = 1; i < levels.length; i++) {
        // Going deeper is allowed one level at a time (h2 → h3), going back up
        // any number of levels is fine (h3 → h2).
        expect(levels[i], `heading #${i + 1} jumps from h${levels[i - 1]}`).toBeLessThanOrEqual(
          levels[i - 1] + 1,
        );
      }
    });

    test("the skip link is the first Tab stop, shows a focus ring and moves focus into main", async ({
      page,
    }) => {
      await page.goto(route);
      await page.keyboard.press("Tab");

      const skipLink = page.getByRole("link", { name: "Skip to content" });
      await expect(skipLink).toBeFocused();
      await expect(skipLink).toBeInViewport();

      // The focus ring from globals.css: 3 px solid, drawn outside the element.
      const ring = await skipLink.evaluate((el) => {
        const style = getComputedStyle(el);
        return { style: style.outlineStyle, width: style.outlineWidth, offset: style.outlineOffset };
      });
      expect(ring).toEqual({ style: "solid", width: "3px", offset: "3px" });

      // Activating it jumps to #main; the next Tab lands inside <main>, not
      // back in the header.
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/#main$/);
      await page.keyboard.press("Tab");
      const focusIsInMain = await page.evaluate(() => Boolean(document.activeElement?.closest("main")));
      expect(focusIsInMain).toBe(true);
    });

    test("every image has an alt attribute", async ({ page }) => {
      await page.goto(route);
      await expect(page.locator("img:not([alt])")).toHaveCount(0);
    });

    test("header and footer links are at least 44 px tall and 24 px wide", async ({ page }) => {
      await page.goto(route);
      const targets = page.locator(".nav-link");
      const count = await targets.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        const box = await targets.nth(i).boundingBox();
        expect(box, `nav link #${i + 1} has no box`).not.toBeNull();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.width).toBeGreaterThanOrEqual(24);
      }
    });
  });

  // Reflow: the page must never be wider than the viewport. A wide table may
  // scroll inside its own region, which does not widen the document.
  for (const width of VIEWPORT_WIDTHS) {
    test(`no page-level horizontal scroll: ${route} at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });
  }
}

test("the home photo has a meaningful alt text", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("img", { name: "Portrait of Juan F. Pinzon" })).toBeVisible();
});

test("the metrics table scrolls inside a labelled, focusable region", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/procurerag");
  const region = page.getByRole("region", { name: /Retrieval metrics table/ });
  await expect(region).toHaveAttribute("tabindex", "0");
  // At 320 px the table really is wider than its box, so the region scrolls.
  const overflows = await region.evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(overflows).toBe(true);
});

test("the architecture diagram has a name and a visible text description", async ({ page }) => {
  await page.goto("/procurerag");
  await expect(page.getByRole("img", { name: /ProcureRAG request flow in six steps/ })).toBeVisible();
  await expect(page.getByText("Text description of the diagram.")).toBeVisible();
});

test.describe("motion", () => {
  test("hover transitions exist normally and are removed under reduced motion", async ({ page }) => {
    await page.goto("/");
    const button = page.locator(".button").first();
    expect(await button.evaluate((el) => getComputedStyle(el).transitionDuration)).toContain("0.15s");

    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await button.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0s");
  });
});

test("no stylesheet removes the focus outline", () => {
  // DESIGN §5: "outline: none is never used without a replacement". The app
  // has a single stylesheet, so the source file is checked directly (no
  // browser needed).
  const css = readFileSync("app/globals.css", "utf8");
  expect(css).not.toMatch(/outline\s*:\s*(none|0)\b/);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  for (const route of ROUTES) {
    test(`${route} keeps its content and navigation`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      const nav = page.getByRole("navigation", { name: "Main" });
      await expect(nav.getByRole("link", { name: "ProcureRAG" })).toBeVisible();
      await expect(nav.getByRole("link", { name: "About" })).toBeVisible();
      await expect(nav.getByRole("link", { name: /CV/ })).toBeVisible();
    });
  }

  test("the static demo explains itself, and the narrow table of contents still opens", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto("/procurerag");
    await expect(page.getByText("Nothing on this page sends a question anywhere.")).toBeVisible();

    // Playwright's getByText() deliberately skips <noscript> elements, so the
    // paragraph is located by its tag instead. With JavaScript off the browser
    // parses <noscript> content as normal elements and renders it.
    const noscriptMessage = page.locator("noscript p");
    await expect(noscriptMessage).toBeVisible();
    await expect(noscriptMessage).toContainText("The live demo, once it ships, will need JavaScript.");

    // <details> is native HTML: it opens with no script.
    const toc = page.locator(".toc--narrow details");
    await expect(toc).not.toHaveAttribute("open", "");
    await toc.locator("summary").click();
    await expect(toc).toHaveAttribute("open", "");
    await expect(toc.getByRole("link", { name: "Evidence" })).toBeVisible();
  });
});
