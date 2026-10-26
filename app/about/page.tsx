import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "@/components/ExternalLink";
import { earlierRoles, education, languages, recentRoles, type Role } from "@/content/experience";
import { links, person } from "@/content/site";
import { credentials, publications, secondaryProject } from "@/content/work";

/*
 * `/about`: the complete context (DESIGN §3, route list).
 *
 * The home page summarizes; this page gives the full CV-sourced chronology,
 * education, languages, research, the secondary project, credentials and
 * contact. Its order repeats the site's evidence rule: experience and work
 * first, course credentials last and small.
 *
 * Server Component, prerendered at build time, no client JavaScript.
 */

export const metadata: Metadata = {
  title: "About",
  description: `Experience, education, research and publications, learning credentials, CV and contact for ${person.name}, ML/AI engineer in ${person.location}.`,
};

/** One role: an h3 with title and employer, a dates/location line, and the approved bullets. */
function RoleEntry({ role }: { role: Role }) {
  return (
    <li>
      <h3>
        {role.title} — {role.employer}
      </h3>
      <p className="muted small">
        {role.start} – {role.end} · {role.location}
      </p>
      <ul>
        {role.highlights.map((highlight) => (
          <li key={highlight}>{highlight}</li>
        ))}
      </ul>
    </li>
  );
}

export default function AboutPage() {
  return (
    <>
      <h1>About {person.name}</h1>
      <p>
        ML/AI engineer based in {person.location}. Three kinds of work, kept separate everywhere on
        this site:
      </p>
      <ul>
        <li>
          <strong>Production ML:</strong> forecasting at PepsiCo since 2022.
        </li>
        <li>
          <strong>Applied research and client proofs of concept:</strong> Novel Software Systems,
          2019–2022.
        </li>
        <li>
          <strong>Independent learning project:</strong>{" "}
          <Link href="/procurerag">ProcureRAG</Link> (2026), over synthetic data, with no employer
          affiliation.
        </li>
      </ul>
      <p>
        The thread through them: procurement first (inventory and textile procurement from 2014),
        then a master&apos;s in big data and AI and nearly three years of applied deep-learning research,
        then production forecasting and procurement analytics, and now retrieval, evaluation and
        agent engineering for procurement questions.
      </p>

      <section aria-labelledby="experience-title">
        <h2 id="experience-title">Experience</h2>
        <p className="muted small">
          Employer facts are as reported on my CV and describe my own role only.
        </p>
        <ul className="roles">
          {recentRoles.map((role) => (
            <RoleEntry key={`${role.title}-${role.employer}`} role={role} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="earlier-roles">
        <h2 id="earlier-roles">Earlier roles (2014–2019)</h2>
        <ul className="roles">
          {earlierRoles.map((role) => (
            <RoleEntry key={`${role.title}-${role.employer}`} role={role} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="education-title">
        <h2 id="education-title">Education and languages</h2>
        <ul>
          {education.map((entry) => (
            <li key={entry.degree}>
              <strong>{entry.degree}</strong>, {entry.school}, {entry.location} · {entry.years}
            </li>
          ))}
        </ul>
        <p>Languages: {languages.join(" · ")}.</p>
      </section>

      <section aria-labelledby="research-title">
        <h2 id="research-title">Research and publications</h2>
        <ul>
          {publications.map((publication) => (
            <li key={publication.id}>
              {publication.citation} {publication.note}
              <ul className="card-links">
                {publication.links.map((link) => (
                  <li key={link.href}>
                    <ExternalLink href={link.href}>{link.label}</ExternalLink>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <p>
          The earlier engineering and research projects, with my role in each, are on the{" "}
          <Link href="/#work-title">home page under Selected work and research</Link>.
        </p>
      </section>

      <section aria-labelledby="projects-title">
        <h2 id="projects-title">Other projects</h2>
        <article className="card" aria-labelledby="secondary-project-title">
          <h3 id="secondary-project-title">{secondaryProject.title}</h3>
          <p className="muted small">{secondaryProject.context}</p>
          <p>{secondaryProject.text}</p>
          <p>{secondaryProject.boundary}</p>
          <ul className="card-links">
            {secondaryProject.links.map((link) => (
              <li key={link.href}>
                <ExternalLink href={link.href}>{link.label}</ExternalLink>
              </li>
            ))}
          </ul>
        </article>
      </section>

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
        <p className="muted">Other courses are listed on the CV.</p>
      </section>

      <section aria-labelledby="contact-title">
        <h2 id="contact-title">CV and contact</h2>
        <ul>
          <li>
            <a href={links.cv.href}>Current CV (PDF, October 2026)</a>
          </li>
          <li>
            Email: <a href={links.email.href}>{links.email.text}</a>
          </li>
          <li>
            <ExternalLink href={links.linkedin.href}>LinkedIn profile</ExternalLink>
          </li>
          <li>
            <ExternalLink href={links.github.href}>GitHub profile</ExternalLink>
          </li>
        </ul>
      </section>
    </>
  );
}
