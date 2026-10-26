/**
 * Shared test data: the three preview routes and the viewport widths the
 * Day 27 route asks for.
 *
 * 320 px is also the WCAG 1.4.10 reflow condition: a 1280 px window at 400%
 * zoom is 320 CSS px wide, so "no sideways scroll at 320 px" is the automated
 * stand-in for the 400% zoom check. (Real browser zoom is still checked by
 * hand, see the learning log.)
 */
export const ROUTES = ["/", "/procurerag", "/about"] as const;

export const VIEWPORT_WIDTHS = [320, 375, 768, 1024, 1280, 1440] as const;
