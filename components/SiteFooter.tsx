import { links } from "@/content/site";
import { ExternalLink } from "./ExternalLink";

/**
 * Global footer (DESIGN §3): GitHub · LinkedIn · Email, plus
 * "Built with Next.js · Source on GitHub". Text links only; no icon-only links,
 * because an icon has no accessible name unless one is added by hand.
 *
 * The three profile links are standalone targets, so each anchor gets the
 * 44 px `nav-link` hit area. The "Source on GitHub" link sits inside a
 * sentence, where WCAG 2.5.8 exempts inline links from the size minimum.
 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <ul className="nav-list" aria-label="Contact and profiles">
          <li>
            <ExternalLink href={links.github.href} className="nav-link">
              {links.github.label}
            </ExternalLink>
          </li>
          <li>
            <ExternalLink href={links.linkedin.href} className="nav-link">
              {links.linkedin.label}
            </ExternalLink>
          </li>
          <li>
            <a href={links.email.href} className="nav-link">
              {links.email.label}
              <span className="visually-hidden"> {links.email.text}</span>
            </a>
          </li>
        </ul>
        <p>
          Built with Next.js · <ExternalLink href={links.siteSource.href}>{links.siteSource.label}</ExternalLink>
        </p>
      </div>
    </footer>
  );
}
