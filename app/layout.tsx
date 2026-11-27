import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { hero, person } from "@/content/site";
import { shareMetadata } from "./share-metadata";
import "./globals.css";

/*
 * Fonts (DESIGN §2, "Evidence Lab"): Bricolage Grotesque for display and
 * headings, Instrument Sans for body text, JetBrains Mono for metrics, IDs,
 * labels and code.
 *
 * All three are variable fonts, so one file per family covers every weight
 * the stylesheet uses. Bricolage also loads its optical-size axis (`opsz`):
 * the large hero letters get tighter, display-cut shapes, while small headings
 * stay sturdy.
 *
 * `next/font/google` downloads the font files at BUILD time and serves them
 * from this site, so a visitor's browser never contacts Google. Each call
 * exposes a CSS variable that globals.css plugs into the `--font-display` /
 * `--font-body` / `--font-mono` tokens.
 */
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-bricolage",
});

const body = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

/*
 * Static metadata (Next.js "Metadata and OG images" → "Static metadata").
 * Every route's title and description are known at build time, so a plain
 * `metadata` object is enough.
 *
 * `title.template` lets each page export a short title ("About") that renders
 * as "About — Juan F. Pinzon". `title.default` is used by the home page.
 *
 * Share tags: `shareMetadata()` adds text-only Open Graph and Twitter card
 * tags. The home page exports no metadata, so it inherits these; the other two
 * routes build their own (see app/share-metadata.ts for why).
 *
 * Deliberately NOT set yet: `metadataBase`, canonical URLs, `og:url`, share
 * images, robots.txt and sitemap.xml. All of them need the final public URL
 * (ADR §11 #9), which arrives with the public cutover.
 */
const homeTitle = `${person.name} — ML/AI engineer`;
const homeDescription = `${hero.valueProposition} Based in ${person.location}.`;

export const metadata: Metadata = {
  title: {
    default: homeTitle,
    template: `%s — ${person.name}`,
  },
  description: homeDescription,
  ...shareMetadata(homeTitle, homeDescription),
};

/*
 * The root layout wraps all three routes. It is a Server Component (the App
 * Router default): no "use client", no state, no effects. It produces the
 * document skeleton every page shares:
 *
 *   <html lang="en">           WCAG 3.1.1: the page language is declared
 *     skip link               the first focusable element (WCAG 2.4.1)
 *     <header> with <nav>     landmark 1 and 2
 *     <main id="main">        landmark 3, the skip-link target
 *     <footer>                landmark 4
 *
 * `<main>` is full width. Each page puts its own content in `.container`, so
 * the home page's feature band can run edge to edge without the `100vw`
 * trick, which overflows by the scrollbar's width and scrolls the page
 * sideways (WCAG 1.4.10).
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
