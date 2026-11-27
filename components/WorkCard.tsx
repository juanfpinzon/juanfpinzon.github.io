import Image from "next/image";
import type { WorkCard as WorkCardData } from "@/content/work";
import { ExternalLink } from "./ExternalLink";

/**
 * One "Selected work and research" card: context, title, tags, then
 * problem → my role → result → links.
 *
 * A description list (`<dl>`) fits this shape: each label ("Problem") is a
 * term and the text after it is its description, so assistive technology
 * reads them as pairs. The cards sit two to a row on wide screens, so each
 * paragraph keeps a readable line length.
 *
 * `headingId` ties the card's `<article>` to its `<h3>` with aria-labelledby,
 * so a screen-reader user moving by landmark or article hears the card's title.
 */
export function WorkCard({ card }: { card: WorkCardData }) {
  const headingId = `work-${card.id}`;

  return (
    <article className="work-card" aria-labelledby={headingId}>
      <div className="work-card__main">
        <p className="work-card__context">{card.context}</p>
        <h3 id={headingId}>{card.title}</h3>
        {card.tags.length > 0 ? (
          <ul className="tags" aria-label="Methods and tools">
            {card.tags.map((tag) => (
              <li key={tag} className="tag">
                {tag}
              </li>
            ))}
          </ul>
        ) : null}

        {card.image ? (
          <figure className="work-card__figure">
            {/*
              next/image serves resized WebP/AVIF variants with width and height
              reserved up front, so the card does not jump when the image loads.
            */}
            <Image
              src={card.image.src}
              width={card.image.width}
              height={card.image.height}
              alt={card.image.alt}
              sizes="(min-width: 640px) 210px, 100vw"
              className="work-card__image"
            />
            <figcaption>{card.image.caption}</figcaption>
          </figure>
        ) : null}

        <dl className="work-card__facts">
          <div>
            <dt>Problem</dt>
            <dd>{card.problem}</dd>
          </div>
          <div>
            <dt>My role</dt>
            <dd>{card.role}</dd>
          </div>
          <div>
            <dt>Result</dt>
            <dd>{card.result}</dd>
          </div>
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
      </div>
    </article>
  );
}
