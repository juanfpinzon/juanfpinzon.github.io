import type { ReactNode } from "react";

/**
 * A link to another website.
 *
 * DESIGN §5: "External links say so in text or aria-label." This component
 * appends a visible arrow (hidden from screen readers, because "north-east
 * arrow" is noise) and a visually hidden "(external site)" that screen readers
 * do announce. The link opens in the same tab: forcing a new tab takes the
 * choice away from the visitor and breaks the Back button.
 *
 * `className` lets a caller give the anchor itself a larger hit area (the
 * header/footer `nav-link` class), so the 44 px target is the link, not a
 * wrapper around it.
 *
 * It is a Server Component (no "use client"): it renders plain HTML and needs
 * no browser JavaScript.
 */
export function ExternalLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a href={href} className={className}>
      {children}
      <span aria-hidden="true">&nbsp;↗</span>
      <span className="visually-hidden"> (external site)</span>
    </a>
  );
}
