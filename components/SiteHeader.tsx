import Link from "next/link";
import { links, navigation, person } from "@/content/site";

/**
 * Global header: the name (home link) plus three text links
 * (DESIGN §3: `Juan F. Pinzon` · `ProcureRAG` · `About` · `CV`).
 *
 * **Why there is no Menu button.** The mobile wireframe shows a [Menu] toggle,
 * but a toggle needs state and an onClick handler, which makes it a Client
 * Component. Three short links fit at 320 px if they wrap onto a second line,
 * so the header stays a Server Component, works before (or without)
 * JavaScript, and has no expanded/collapsed state to get wrong. This is a
 * recorded deviation from the wireframe, decided by Juan on Day 27.
 *
 * **Why the CV uses `<a>` and not `<Link>`.** `next/link` is for app routes:
 * it prefetches the route's React Server Component payload and navigates on
 * the client. `/cv.pdf` is a static file, not a route, so a plain anchor is the
 * correct element. Internal routes still use `<Link>`, which renders an
 * ordinary `<a href>` in the HTML and therefore also works without JavaScript.
 */
export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link href="/" className="site-header__name nav-link">
          {person.name}
        </Link>
        <nav aria-label="Main">
          <ul className="nav-list">
            {navigation.map((item) =>
              item.href === links.cv.href ? (
                <li key={item.href}>
                  <a href={item.href} className="nav-link">
                    {item.label}
                    <span className="visually-hidden"> (PDF)</span>
                  </a>
                </li>
              ) : (
                <li key={item.href}>
                  <Link href={item.href} className="nav-link">
                    {item.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}
