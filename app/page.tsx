import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "@/components/ExternalLink";
import { Pipeline } from "@/components/Pipeline";
import { RecordedRuns } from "@/components/RecordedRuns";
import { WorkCard } from "@/components/WorkCard";
import { careerPath, recentRoles } from "@/content/experience";
import { featureMetrics, procureragLinks } from "@/content/procurerag";
import { capabilities, hero, links, person } from "@/content/site";
import { archive, credentials, selectedWork } from "@/content/work";
import headshot from "@/public/images/juan-pinzon-headshot.webp";

/*
 * `/`: the recruiter path (DESIGN §3), rebuilt as a story in six beats.
 *
 * The order of the sections IS the design. A recruiter scrolling once gets:
 *   01 who Juan is, the one-line positioning, and four scan-able facts;
 *   02 ProcureRAG, the flagship, straight after: numbers with their methods,
 *      the request path, and five recorded runs, including the known failure;
 *   03 the skills, each tied to the place it is proven;
 *   04 the career path from procurement to AI engineering;
 *   05 earlier research and engineering worth opening;
 *   06 credentials (small) and contact.
 *
 * This page is a Server Component and is prerendered at build time. It has no
 * state, effects or event handlers, so it ships no page-specific client
 * JavaScript and reads the same with JavaScript turned off. Its one motion
 * (the pipeline pulse and the hero's entrance) is CSS, and is switched off
 * under `prefers-reduced-motion`.
 *
 * No `metadata` export here: the home page uses the root layout's
 * `title.default` and description.
 */

const currentRole = recentRoles[0];

export default function HomePage() {
  return (
    <>
      {/* 01. Hero: positioning, lede, actions, portrait, proof line. */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="container">
          <div className="hero__grid">
            <div className="hero__copy">
              <p className="kicker">
                <span className="kicker__index">01</span>
                {person.name} · {hero.role} · {person.location}
              </p>
              <h1 id="hero-title" className="hero__title">
                {hero.headline.lead} <em>{hero.headline.emphasis}</em>
              </h1>
              <p className="hero__value">{hero.valueProposition}</p>
              <p className="hero__lede">{hero.lede}</p>
              <div className="hero__actions">
                <a href="#flagship-title" className="button">
                  See the flagship project<span aria-hidden="true">&nbsp;↓</span>
                </a>
                <a href={links.cv.href} className="button button--ghost">
                  Download CV<span className="visually-hidden"> (PDF)</span>
                </a>
                <span className="hero__links">
                  <ExternalLink href={links.linkedin.href}>{links.linkedin.label}</ExternalLink>
                  <a href={links.email.href}>{links.email.label}</a>
                </span>
              </div>
            </div>

            {/*
              The photo is a deliberate head-and-shoulders crop, exported as a
              480 × 480 WebP (10 KB). A static import lets Next.js read its
              dimensions at build time, so nothing shifts while it loads.
              `preload` because it is part of the first screen.
            */}
            <figure className="portrait">
              <Image
                src={headshot}
                alt={`Portrait of ${person.name}`}
                className="portrait__image"
                sizes="(min-width: 1024px) 320px, (min-width: 768px) 260px, 200px"
                preload
              />
              <figcaption className="portrait__badge">
                <span className="portrait__label">Now</span>
                <span className="portrait__role">{currentRole.title}</span>
                <span className="portrait__org">
                  {currentRole.employer}, {currentRole.area}
                </span>
              </figcaption>
            </figure>
          </div>

          <ul className="proof" aria-label="At a glance">
            {hero.proof.map((item) => (
              <li key={item.label} className="proof__item">
                <span className="proof__value">{item.value}</span>
                <span className="proof__label">{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 02. Flagship project: a full-width dark band. */}
      <section id="procurerag" className="feature" aria-labelledby="flagship-title">
        <div className="container">
          <div className="feature__intro">
            <div>
              <p className="kicker kicker--on-dark">
                <span className="kicker__index">02</span>
                Flagship project · independent
              </p>
              <h2 id="flagship-title" className="feature__title">
                ProcureRAG
              </h2>
              <p className="feature__tagline">
                A procurement copilot that answers policy questions with cited sources, or says
                exactly which evidence is missing.
              </p>
            </div>
            <div className="feature__about">
              <p>
                Built from primitives and measured at every layer, over a <strong>synthetic</strong>{" "}
                knowledge base: 34 documents of a fictional company, Vantera. An independent learning
                project, with no employer data, systems, affiliation or endorsement, and not a
                production system.
              </p>
              <div className="feature__actions">
                <Link href="/procurerag" className="button button--on-dark">
                  Read the case study<span aria-hidden="true">&nbsp;→</span>
                </Link>
                <ExternalLink href={procureragLinks.repo}>ProcureRAG code on GitHub</ExternalLink>
              </div>
            </div>
          </div>

          {/*
            Headline numbers. Each tile names its method (inventory §4), so
            none of them reads as a bare score.
          */}
          <ul className="metrics" aria-label="Evidence highlights">
            {featureMetrics.map((metric) => (
              <li key={metric.label} className="metric">
                <span className="metric__value">{metric.value}</span>
                <span className="metric__label">{metric.label}</span>
                <span className="metric__note">{metric.note}</span>
              </li>
            ))}
          </ul>

          <Pipeline />
          <RecordedRuns />

          <p className="feature__status">
            <span className="status-dot" aria-hidden="true" />
            <span>
              <strong>Live demo: in progress.</strong> The hosted chat passed its launch smoke test
              and stays switched off until launch.{" "}
              <Link href="/procurerag#demo">How the chat works</Link>
            </span>
          </p>
        </div>
      </section>

      {/* 03. Skills, each tied to its evidence. */}
      <section className="band" aria-labelledby="skills-title">
        <div className="container">
          <div className="section-head">
            <p className="kicker">
              <span className="kicker__index">03</span>
              What I bring
            </p>
            <h2 id="skills-title">Skills, each with its evidence</h2>
            <p className="section-head__lede">
              Six areas I work in, and where on this site you can check each one.
            </p>
          </div>
          <ul className="skills">
            {capabilities.map((skill) => (
              <li key={skill.id} className="skill">
                <h3>{skill.title}</h3>
                <p>{skill.text}</p>
                <ul className="tags" aria-label={`${skill.title}: tools`}>
                  {skill.tags.map((tag) => (
                    <li key={tag} className="tag">
                      {tag}
                    </li>
                  ))}
                </ul>
                <Link href={skill.evidence.href} className="skill__evidence">
                  {skill.evidence.label}
                  <span aria-hidden="true">&nbsp;→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 04. Career path, oldest first: the story behind ProcureRAG's domain. */}
      <section className="band band--sunken" aria-labelledby="career-title">
        <div className="container">
          <div className="section-head">
            <p className="kicker">
              <span className="kicker__index">04</span>
              Career path
            </p>
            <h2 id="career-title">From procurement to AI engineering</h2>
            <p className="section-head__lede">
              Twelve years, one thread: procurement first, then a master&apos;s and applied ML research,
              then ML in production at PepsiCo, and now RAG and agents for procurement questions.
            </p>
          </div>
          <ol className="timeline">
            {careerPath.map((step) => (
              <li key={step.title} className="timeline__item">
                <p className="timeline__years">{step.years}</p>
                <h3 className="timeline__title">{step.title}</h3>
                <p className="timeline__org">{step.org}</p>
                <p className="timeline__summary">{step.summary}</p>
              </li>
            ))}
          </ol>
          <p className="section-foot">
            <Link href="/about">Full experience, education and languages</Link>
            <span aria-hidden="true"> → </span>
          </p>
        </div>
      </section>

      {/* 05. Selected work and research, then the archive line. */}
      <section className="band" aria-labelledby="work-title">
        <div className="container">
          <div className="section-head">
            <p className="kicker">
              <span className="kicker__index">05</span>
              Before ProcureRAG
            </p>
            <h2 id="work-title">Selected work and research</h2>
            <p className="section-head__lede">
              Applied research and client proofs of concept at Novel Software Systems, 2019–2022.
            </p>
          </div>
          <div className="work-grid">
            {selectedWork.map((card) => (
              <WorkCard key={card.id} card={card} />
            ))}
          </div>
          <p className="section-foot">
            Archive: <ExternalLink href={archive.href}>{archive.label}</ExternalLink>.{" "}
            <span className="muted">{archive.note}</span>
          </p>
        </div>
      </section>

      {/* 06. Credentials (small) and contact. */}
      <section className="band band--tight" aria-labelledby="credentials-title">
        <div className="container credentials">
          <h2 id="credentials-title" className="credentials__title">
            Learning credentials
          </h2>
          <ul className="credentials__list">
            {credentials.map((credential) => (
              <li key={credential.id}>
                <span>{credential.text}</span>{" "}
                <Link href={credential.evidence.href}>{credential.evidence.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="contact" aria-labelledby="contact-title">
        <div className="container contact__inner">
          <div>
            <p className="kicker kicker--on-dark">
              <span className="kicker__index">06</span>
              Contact
            </p>
            <h2 id="contact-title" className="contact__title">
              Let&apos;s talk about RAG, evals or agents.
            </h2>
            <p className="contact__lede">Email is the fastest way to reach me.</p>
            <a href={links.email.href} className="contact__email">
              {links.email.text}
            </a>
          </div>
          <ul className="contact__links">
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
        </div>
      </section>
    </>
  );
}
