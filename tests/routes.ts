/**
 * Shared test data: the three preview routes, the viewport widths the Day 27
 * route asks for, and the forbidden-claims list. The list lives here (not in
 * a spec file) because both the page-text test and the metadata test use it,
 * and importing one spec file into another would register its tests twice.
 *
 * 320 px is also the WCAG 1.4.10 reflow condition: a 1280 px window at 400%
 * zoom is 320 CSS px wide, so "no sideways scroll at 320 px" is the automated
 * stand-in for the 400% zoom check. (Real browser zoom is still checked by
 * hand, see the learning log.)
 */
export const ROUTES = ["/", "/procurerag", "/about"] as const;

export const VIEWPORT_WIDTHS = [320, 375, 768, 1024, 1280, 1440] as const;

/**
 * Phrases that must never appear on any route. Each one is a real risk from
 * the inventory: an employer title Juan never held, a credential not yet
 * earned, the old site's wrong numbers, or a claim that something is live.
 */
export const FORBIDDEN: { pattern: RegExp; why: string }[] = [
  { pattern: /senior ai engineer/i, why: "a target role, never a held title" },
  { pattern: /azure ai engineer/i, why: "credential still in progress (CV only)" },
  { pattern: /SEPLN 2021/i, why: "the NER paper is 2020" },
  { pattern: /\b500 (CVs|annotated|resumes)/i, why: "the dataset README says 545" },
  { pattern: /\b7 years\b/i, why: "the August CV's over-claim" },
  { pattern: /try (the )?(live )?demo/i, why: "no demo exists yet" },
  { pattern: /live demo:(?! in progress)/i, why: "the demo status must stay 'in progress'" },
  { pattern: /(?<!not )answer accuracy/i, why: "P@1 is retrieval ranking, not answer accuracy" },
  { pattern: /(?<!not a )deployed clinical/i, why: "the U-NET work was a proof of concept" },
  { pattern: /production[- ]ready|enterprise[- ](ready|grade)/i, why: "ProcureRAG is a learning project" },
  { pattern: /endorsed by|in partnership with/i, why: "no employer endorsement" },
  { pattern: /currently deployed|live on azure|running on azure/i, why: "the Azure resources were deleted" },
];
