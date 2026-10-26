import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { hero, person } from "@/content/site";
import "./globals.css";

/*
 * Fonts (DESIGN §2): Source Serif 4 for headings, Inter for body text,
 * JetBrains Mono for metrics, IDs and code.
 *
 * `next/font/google` downloads the font files at BUILD time and serves them
 * from this site, so a visitor's browser never contacts Google. Each call
 * exposes a CSS variable (`--font-source-serif`, …) that globals.css plugs into
 * the `--font-heading` / `--font-body` / `--font-mono` tokens.
 */
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-source-serif",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-jetbrains-mono",
});

/*
 * Static metadata (Next.js "Metadata and OG images" → "Static metadata").
 * Every route's title and description are known at build time, so a plain
 * `metadata` object is enough; `generateMetadata` is only needed when metadata
 * depends on fetched data, which nothing here does.
 *
 * `title.template` lets each page export a short title ("About") that renders
 * as "About — Juan F. Pinzon". `title.default` is used by the home page.
 *
 * Deliberately NOT set on Day 27:
 * - `metadataBase`, canonical URLs, Open Graph/Twitter images, robots.txt and
 *   sitemap.xml. All of them need the public URL, which is still an open ADR
 *   decision (§11 #9: `vercel.app` plus a `github.io` redirect, or a custom
 *   domain). Publishing a canonical to a URL that may change is worse than
 *   publishing none.
 */
export const metadata: Metadata = {
  title: {
    default: `${person.name} — ML/AI engineer`,
    template: `%s — ${person.name}`,
  },
  description: `${hero.valueProposition} Based in ${person.location}.`,
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
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sourceSerif.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="container">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
