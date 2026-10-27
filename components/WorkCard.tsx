import Image from "next/image";
import type { WorkCard as WorkCardData } from "@/content/work";
import { ExternalLink } from "./ExternalLink";

/**
 * One "Selected work and research" card, laid out as
 * problem → role → result → links (DESIGN §3, recruiter path step 4).
 *
 * A description list (`<dl>`) fits this shape: each label ("Problem") is a
 * term and the text after it is its description, so assistive technology
 * reads them as pairs.
 *
 * `headingId` ties the card's `<article>` to its `<h3>` with aria-labelledby,
 * so a screen-reader user moving by landmark or article hears the card's title.
 */
export function WorkCard({ card }: { card: WorkCardData }) {
  const headingId = `work-${card.id}`;

  return (
    <article className="card" aria-labelledby={headingId}>
      <h3 id={headingId}>{card.title}</h3>
      <p className="muted small">{card.context}</p>

      {card.image ? (
        <figure>
          {/*
            next/image serves resized WebP/AVIF variants with width and height
            reserved up front, so the card does not jump when the image loads.
            `sizes` tells the browser how wide the image will be: the full
            screen on phones, half at 768–1023 px, a quarter of the container
            above that.
          */}
          <Image
            src={card.image.src}
            width={card.image.width}
            height={card.image.height}
            alt={card.image.alt}
            sizes="(min-width: 1024px) 260px, (min-width: 768px) 50vw, 100vw"
            className="card__image"
          />
          <figcaption>{card.image.caption}</figcaption>
        </figure>
      ) : null}

      <dl>
        <dt>Problem</dt>
        <dd>{card.problem}</dd>
        <dt>Role</dt>
        <dd>{card.role}</dd>
        <dt>Result</dt>
        <dd>{card.result}</dd>
      </dl>

      {card.links.length > 0 ? (
        <ul className="card-links">
          {card.links.map((link) => (
            <li key={link.href}>
              <ExternalLink href={link.href}>{link.label}</ExternalLink>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">No public code or paper: the client owns the materials.</p>
      )}
    </article>
  );
}
