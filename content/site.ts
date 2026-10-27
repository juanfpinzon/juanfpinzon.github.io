/**
 * Site-wide facts: who, where, and how to get in touch.
 *
 * Every string here is copied from the accepted Day 26 content inventory
 * (`docs/portfolio-content-inventory.md`, §2 and §7) or from the corrected
 * October 2026 CV. Pages import these values instead of retyping them, so a
 * correction is made once and appears everywhere (header, hero, footer, About).
 *
 * This file holds only plain data. It has no React code and no secrets, so it is
 * safe for any component, server or client, to import.
 */

export const person = {
  name: "Juan F. Pinzon",
  fullName: "Juan Fernando Pinzon",
  location: "Barcelona, Spain",
} as const;

/**
 * The hero copy, verbatim from inventory §7 ("Main (selected)" and
 * "Supporting line"). The target title "Senior AI Engineer" is deliberately
 * absent: it is a target role, never an employer title (inventory §2).
 */
export const hero = {
  valueProposition:
    "ML/AI engineer with production forecasting and procurement experience, building evidence-driven RAG and agentic applications.",
  supportingLine:
    "Working in ML and data science since 2019. Production forecasting at PepsiCo since 2022, procurement roots since 2014, and now hands-on RAG, evaluation and agent engineering.",
} as const;

/**
 * Contact and profile links. `href` is the real destination; the tests in
 * `tests/content.spec.ts` assert these exact values so a typo is caught.
 *
 * - `cv` is a same-site path. The PDF in `public/cv.pdf` is a byte-for-byte copy
 *   of `docs/JuanFernandoPinzon_CV_Oct2026.pdf`, the corrected, tagged CV.
 * - LinkedIn redirects logged-out visitors to an auth wall (inventory §1); the
 *   link is still correct, so it stays.
 */
export const links = {
  cv: { label: "CV", href: "/cv.pdf" },
  github: { label: "GitHub", href: "https://github.com/juanfpinzon" },
  linkedin: { label: "LinkedIn", href: "https://www.linkedin.com/in/juanfpinzon/" },
  email: { label: "Email", href: "mailto:juancho704@gmail.com", text: "juancho704@gmail.com" },
  siteSource: {
    label: "Source on GitHub",
    href: "https://github.com/juanfpinzon/juanfpinzon.github.io",
  },
} as const;

/** The three preview routes, used by the header navigation. */
export const navigation = [
  { label: "ProcureRAG", href: "/procurerag" },
  { label: "About", href: "/about" },
  { label: "CV", href: links.cv.href },
] as const;
