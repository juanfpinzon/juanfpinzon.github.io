import Link from "next/link";
import { links, navigation, person } from "@/content/site";

/**
 * Global header: a monogram and the name (home link), plus four text links.
 *
 * It is sticky, with a translucent background, so "CV" and "Contact" are one
 * click away on a long page. It stays a Server Component: no menu button.
 * Four short links wrap onto a second line at 320 px instead of hiding behind
 * a toggle, so the header works before (or without) JavaScript and has no
 * expanded/collapsed state to get wrong (a recorded Day 27 decision).
 *
 * The monogram is decorative (`aria-hidden`): the link's accessible name is
 * the name itself, "Juan F. Pinzon".
 *
 * **Why the CV uses `<a>` and not `<Link>`.** `next/link` is for app routes;
 * `/cv.pdf` is a static file, so a plain anchor is the correct element.
 */
export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link href="/" className="brand nav-link">
          <span className="brand__mark" aria-hidden="true">
            JP
          </span>
          <span className="brand__name">{person.name}</span>
        </Link>
        <nav aria-label="Main">
          <ul className="nav-list">
            {navigation.map((item) =>
              item.href === links.cv.href ? (
                <li key={item.href}>
                  <a href={item.href} className="nav-link nav-link--cv">
                    {item.label}
                    <span className="visually-hidden"> (PDF)</span>
                    <span aria-hidden="true">&nbsp;↓</span>
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
