import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "@/components/ExternalLink";
import { WorkCard } from "@/components/WorkCard";
import { recentRoles } from "@/content/experience";
import { procureragLinks } from "@/content/procurerag";
import { hero, links, person } from "@/content/site";
import { archive, credentials, selectedWork } from "@/content/work";
import headshot from "@/public/images/juan-pinzon-headshot.webp";

/*
 * `/`: the recruiter path (DESIGN §3).
 *
 * The order of the sections IS the design. A recruiter scrolling once should
 * get, in this order:
 *   1. who Juan is and what he is aiming at (hero), with CV and contact links;
 *   2. the production-ML and procurement experience behind that claim;
 *   3. ProcureRAG, the flagship, with honestly labeled evidence;
 *   4. earlier research and engineering worth opening;
 *   5. learning credentials, small, after the work;
 *   6. contact.
 *
 * This page is a Server Component and is prerendered at build time. It has no
 * state, effects or event handlers, so it ships no page-specific client
 * JavaScript and reads the same with JavaScript turned off.
 *
 * No `metadata` export here: the home page uses the root layout's
 * `title.default` and description.
 */
export default function HomePage() {
  return (
    <>
      {/* 1. Hero: name, value proposition, location, primary links. */}
      <section className="hero" aria-labelledby="hero-title">
        <div>
          <p className="eyebrow">{person.name}</p>
          <h1 id="hero-title">{hero.valueProposition}</h1>
          <p>{hero.supportingLine}</p>
          <p className="muted">Based in {person.location}</p>
          <div className="hero__links">
            <Link href="/procurerag" className="button">
              Read the ProcureRAG case study<span aria-hidden="true">&nbsp;→</span>
            </Link>
            <a href={links.cv.href}>
              {links.cv.label}
              <span className="visually-hidden"> (PDF)</span>
            </a>
            <ExternalLink href={links.linkedin.href}>{links.linkedin.label}</ExternalLink>
            <a href={links.email.href}>{links.email.label}</a>
          </div>
        </div>
        {/*
          The photo is a deliberate head-and-shoulders crop of
          assets/img/pic-juan.png, exported as a 480 × 480 WebP (10 KB, from a
          1.9 MB source). A static import lets Next.js read its dimensions at
          build time, so space is reserved and nothing shifts while it loads.
          `preload` because it is part of the first screen.
        */}
        <Image
          src={headshot}
          alt={`Portrait of ${person.name}`}
          className="hero__photo"
          sizes="(min-width: 1024px) 220px, 160px"
          preload
        />
      </section>

      {/* 2. Experience: three rows, exact held titles, and a pointer to the rest. */}
      <section aria-labelledby="experience-title">
        <h2 id="experience-title">Experience</h2>
        <ul className="roles">
          {recentRoles.map((role) => (
            <li key={role.title}>
              <span className="role__title">{role.title}</span>
              {" — "}
              {role.employer}
              {role.area ? `, ${role.area}` : ""}
              <span className="muted"> · {role.years}</span>
            </li>
          ))}
        </ul>
        <p>
          <Link href="/about#earlier-roles">Earlier: procurement and operations roles (2014–2019)</Link>
        </p>
      </section>

      {/* 3. Flagship project. */}
      <section aria-labelledby="flagship-title">
        <p className="eyebrow">Flagship project</p>
        <h2 id="flagship-title" className="mt-0">
          ProcureRAG
        </h2>
        <div className="card flagship">
          <div>
            <p>
              A procurement-intelligence copilot over a <strong>synthetic</strong> knowledge base: 34
              documents of a fictional company, Vantera. An independent learning project, with no
              employer data, systems, affiliation or endorsement, and not a production system.
            </p>
            <ul className="card-links">
              <li>
                <Link href="/procurerag">Read the case study</Link>
              </li>
              <li>
                <ExternalLink href={procureragLinks.repo}>ProcureRAG code on GitHub</ExternalLink>
              </li>
            </ul>
          </div>
          <div>
            {/*
              Short evidence chips. Each one names its method, so none of them
              reads as a bare score. "430+" (the same as the CV) does not go
              stale as tests are added; the case study gives the exact count
              with its commit and date.
            */}
            <ul className="chips" aria-label="Evidence highlights">
              <li className="chip">P@1 0.978 retrieval ranking (93 queries)</li>
              <li className="chip">430+ tests + eval-gated CI</li>
              <li className="chip">guarded FastAPI + local MCP</li>
            </ul>
            <p className="status">Live demo: in progress</p>
          </div>
        </div>
      </section>

      {/* 4. Selected work and research, then the archive line. */}
      <section aria-labelledby="work-title">
        <h2 id="work-title">Selected work and research</h2>
        <div className="grid grid--4">
          {selectedWork.map((card) => (
            <WorkCard key={card.id} card={card} />
          ))}
        </div>
        <p className="mt-5">
          Archive: <ExternalLink href={archive.href}>{archive.label}</ExternalLink>.{" "}
          <span className="muted">{archive.note}</span>
        </p>
      </section>

      {/* 5 and 6. Credentials (small) and contact, side by side on wide screens. */}
      <div className="grid grid--2">
        <section aria-labelledby="credentials-title" className="credentials">
          <h2 id="credentials-title">Learning credentials</h2>
          <ul>
            {credentials.map((credential) => (
              <li key={credential.id}>
                {credential.text}{" "}
                <Link href={credential.evidence.href}>{credential.evidence.label}</Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="contact-title">
          <h2 id="contact-title">Contact</h2>
          <ul>
            <li>
              Email: <a href={links.email.href}>{links.email.text}</a>
            </li>
            <li>
              <ExternalLink href={links.linkedin.href}>LinkedIn profile</ExternalLink>
            </li>
            <li>
              <ExternalLink href={links.github.href}>GitHub profile</ExternalLink>
            </li>
            <li>
              <a href={links.cv.href}>Current CV (PDF, October 2026)</a>
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}
