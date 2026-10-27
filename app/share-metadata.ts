import type { Metadata } from "next";
import { person } from "@/content/site";

/**
 * Text-only share metadata (Open Graph and Twitter card tags) for one route.
 *
 * **Why a helper.** Next.js merges `metadata` objects from the layout and the
 * page *shallowly*: a page that sets `openGraph` replaces the layout's whole
 * `openGraph` object, it does not add to it. So every route that has its own
 * title must also build its own complete `openGraph` and `twitter` objects.
 * This function builds both from one title and one description, so the shared
 * fields (`siteName`, `locale`, `type`, `card`) are written once.
 *
 * **What is deliberately missing.** No `images`, no `url`, and no canonical.
 * A share image and `og:url` must be ABSOLUTE URLs. Without the public URL
 * (still an open ADR decision, §11 #9), Next.js would resolve them against
 * `http://localhost:3000` in a local build, which is wrong on any social card.
 * They arrive with the Day 30 cutover. Text tags do not need a URL, and they
 * repeat the route's own title and description, so they make no new claim.
 *
 * `twitter.card: "summary"` is the small text card, the right type when there
 * is no image (the large-image card would need one).
 */
export function shareMetadata(
  title: string,
  description: string,
): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      type: "website",
      siteName: person.name,
      locale: "en_US",
      title,
      description,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}
