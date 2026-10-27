import { expect, test, type Page } from "@playwright/test";
import { FORBIDDEN, ROUTES } from "./routes";

/*
 * Metadata: what a search engine or a social card reads from <head>.
 *
 * Three things are checked on every route:
 * 1. the text-only share tags exist and repeat the route's own title and
 *    description (so a shared link can never say more than the page does);
 * 2. the deferred URL-based tags are really absent. `og:image`, `og:url`,
 *    `twitter:image` and the canonical link all need the public URL (ADR
 *    §11 #9). In a local build Next.js would resolve them to localhost, so
 *    "absent" is the correct state until the Day 30 cutover, and this test
 *    makes that exception explicit instead of accidental;
 * 3. the forbidden-claims list also holds for the <head> text, which the
 *    page-text test in content.spec.ts cannot see.
 */

/** The exact <title> each route must render (title.template applied). */
const EXPECTED_TITLES: Record<(typeof ROUTES)[number], string> = {
  "/": "Juan F. Pinzon — ML/AI engineer",
  "/procurerag": "ProcureRAG case study — Juan F. Pinzon",
  "/about": "About — Juan F. Pinzon",
};

/** Read a <meta> tag's content by its `property` (Open Graph) or `name` (Twitter, description). */
async function meta(page: Page, attribute: "property" | "name", key: string) {
  const tag = page.locator(`head meta[${attribute}="${key}"]`);
  return (await tag.count()) === 0 ? null : tag.first().getAttribute("content");
}

for (const route of ROUTES) {
  test(`${route} has text-only share tags that match the page`, async ({ page }) => {
    await page.goto(route);
    const title = await page.title();
    const description = await meta(page, "name", "description");

    expect(title).toBe(EXPECTED_TITLES[route]);
    expect(description).toBeTruthy();

    // Open Graph (Facebook, LinkedIn, Slack, …) and Twitter/X card tags.
    expect(await meta(page, "property", "og:title")).toBe(title);
    expect(await meta(page, "property", "og:description")).toBe(description);
    expect(await meta(page, "property", "og:type")).toBe("website");
    expect(await meta(page, "property", "og:site_name")).toBe("Juan F. Pinzon");
    expect(await meta(page, "property", "og:locale")).toBe("en_US");
    expect(await meta(page, "name", "twitter:card")).toBe("summary");
    expect(await meta(page, "name", "twitter:title")).toBe(title);
    expect(await meta(page, "name", "twitter:description")).toBe(description);
  });

  test(`${route} has no URL-based share tags until the public URL exists`, async ({ page }) => {
    await page.goto(route);
    for (const key of ["og:image", "og:url"]) {
      expect(await meta(page, "property", key), `${key} must wait for Day 30`).toBeNull();
    }
    expect(await meta(page, "name", "twitter:image"), "twitter:image must wait for Day 30").toBeNull();
    await expect(page.locator('head link[rel="canonical"]')).toHaveCount(0);
  });

  test(`${route} metadata has none of the forbidden claims`, async ({ page }) => {
    await page.goto(route);
    // Every piece of <head> text a person could read: the title and every meta content.
    const headText = [
      await page.title(),
      ...(await page
        .locator("head meta[content]")
        .evaluateAll((tags) => tags.map((tag) => tag.getAttribute("content") ?? ""))),
    ].join("\n");

    for (const { pattern, why } of FORBIDDEN) {
      expect(headText, `${route} <head> matches ${pattern} (${why})`).not.toMatch(pattern);
    }
  });
}
