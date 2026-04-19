import Link from 'next/link';
import { MethodologySection } from './_components/methodology-section';
import { SourcesTable } from './_components/sources-table';

/**
 * Manually bumped when the page copy or source inventory changes. We
 * deliberately avoid a build-time stamp so the timestamp reflects
 * editorial review, not deploy time.
 */
const LAST_UPDATED = '2026-04-18';

export const metadata = {
  title: 'About — Gigawatt Map',
  description:
    'How Gigawatt Map is built: methodology, confidence tiers, every data source with license, and known gaps.',
};

export default function AboutPage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-bg-base">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-accent-focus focus:px-3 focus:py-2 focus:font-mono focus:text-xs focus:text-bg-base"
      >
        Skip to content
      </a>
      <main id="main" className="mx-auto w-full max-w-[65ch] px-4 py-12 font-serif text-text-primary md:py-16">
        <header className="mb-12 border-b border-bg-elevated pb-8">
          <h1 className="font-sans text-3xl font-semibold tracking-tight md:text-4xl">
            About Gigawatt Map
          </h1>
          <p className="mt-3 font-mono text-xs uppercase tracking-widest text-text-subtle">
            Last updated <span className="tabular">{LAST_UPDATED}</span>
          </p>
        </header>

        <Section id="what" title="What this is">
          <p>
            Gigawatt Map is a public atlas of the physical infrastructure behind the AI buildout:
            every datacenter we can verify, the power plants and substations feeding it, the
            submarine cables connecting regions, and the operators and tickers with exposure.
          </p>
          <p>
            It is not a trading tool, a real-estate listing service, or a permit database. It is a
            reference map for anyone trying to understand where AI capacity is actually being
            built, who is paying for it, and what grid is absorbing the load.
          </p>
          <p>
            The project is open-source and open-data. The code is MIT; the data carries the
            licenses of its upstream sources, listed in full below.
          </p>
        </Section>

        <Section id="audience" title="Who it's for">
          <p>
            We write the page with five readers in mind. If you are not one of these, it probably
            still works, but these are the use cases we actively design against:
          </p>
          <ol className="not-prose my-4 space-y-3 text-sm">
            <li>
              <strong className="font-sans text-text-primary">AI infrastructure investors</strong>
              <span className="font-serif text-text-muted">
                {' '}
                — locating operator capex exposure in 30 seconds and confirming a name against a
                site and a substation before sizing a position.
              </span>
            </li>
            <li>
              <strong className="font-sans text-text-primary">Analysts &amp; journalists</strong>
              <span className="font-serif text-text-muted">
                {' '}
                — cross-referencing announced MW against built MW, grounding a story in a map they
                can cite.
              </span>
            </li>
            <li>
              <strong className="font-sans text-text-primary">Developers &amp; operators</strong>
              <span className="font-serif text-text-muted">
                {' '}
                — scouting power and interconnect adjacency for new builds.
              </span>
            </li>
            <li>
              <strong className="font-sans text-text-primary">Curious technologists</strong>
              <span className="font-serif text-text-muted">
                {' '}
                — seeing where the model they used last night physically lives, and what it is
                plugged into.
              </span>
            </li>
            <li>
              <strong className="font-sans text-text-primary">Educators &amp; students</strong>
              <span className="font-serif text-text-muted">
                {' '}
                — an on-ramp to the material reality of AI compute.
              </span>
            </li>
          </ol>
        </Section>

        <Section id="pipeline" title="How we built it">
          <p>
            A Python pipeline (<code className="font-mono text-sm text-text-muted">data-pipeline/</code>)
            fetches each source on its own cadence, normalizes it against Pydantic schemas, and
            writes merged artifacts — per-source GeoJSON for ODbL compliance, plus PMTiles for the
            web map. Every pipeline run emits a{' '}
            <code className="font-mono text-sm text-text-muted">manifest.json</code> with source
            versions, row counts, and hashes so a given map tile is traceable back to the exact
            upstream snapshot.
          </p>
          <p>
            The web app (<code className="font-mono text-sm text-text-muted">apps/web/</code>) is a
            Next.js App Router build served at the edge. API routes query the artifacts by
            bounding box; nothing hits a live upstream at request time.
          </p>
          <p>
            Refresh cadences vary by source and are documented in the inventory below. &ldquo;Last
            updated&rdquo; at the top of this page reflects editorial review, not the freshest
            tile.
          </p>
        </Section>

        <Section id="methodology" title="Methodology">
          <MethodologySection />
        </Section>

        <Section id="sources" title="Data sources">
          <p>
            Every layer the reader sees on the map is sourced from a public dataset or a
            hand-curated list maintained in this repo. License terms are honored: ODbL sources are
            redistributed per-source (never merged into a single download), and CC BY-NC-SA
            sources are used only for non-commercial display.
          </p>
          <div className="mt-6">
            <SourcesTable />
          </div>
        </Section>

        <Section id="gaps" title="Known gaps">
          <p>
            We prefer to be loud about what the map does <em>not</em> cover:
          </p>
          <ul className="not-prose my-4 space-y-2 text-sm text-text-muted">
            <li>
              <span className="font-serif">
                Chinese datacenter coverage is limited. OSM tagging is sparse in mainland China and
                regulatory filings are not public, so our Chinese footprint is best-effort from
                press coverage and operator disclosures.
              </span>
            </li>
            <li>
              <span className="font-serif">
                Indian coverage is improving as hyperscaler builds are announced, but lags the US
                and EU.
              </span>
            </li>
            <li>
              <span className="font-serif">
                Russia, Belarus, and Central Asia are poor — we would rather show gaps than guess.
              </span>
            </li>
            <li>
              <span className="font-serif">
                MW values for pre-2020 colo facilities are frequently estimated from footprint, not
                disclosed. Treat them as ranges.
              </span>
            </li>
            <li>
              <span className="font-serif">
                Neoclouds announce and lease capacity faster than our refresh cadence. If you see a
                fresh announcement, it probably beats the map.
              </span>
            </li>
          </ul>
        </Section>

        <Section id="contribute" title="Contribute">
          <p>
            The repository lives on{' '}
            <a
              href="https://github.com/gigawattmap/gigawattmap"
              target="_blank"
              rel="noreferrer"
              className="font-mono text-text-primary underline decoration-text-subtle underline-offset-2 hover:decoration-text-primary"
            >
              GitHub
            </a>
            . Open a pull request against{' '}
            <code className="font-mono text-sm text-text-muted">data/curated/</code> to add or
            correct a facility; every row needs a primary{' '}
            <code className="font-mono text-sm text-text-muted">source_url</code>. For larger
            contributions — a new source module, a methodology change — open an issue first.
          </p>
          <p>
            Press and partnership inquiries:{' '}
            <a
              href="mailto:hello@gigawattmap.com"
              className="font-mono text-text-primary underline decoration-text-subtle underline-offset-2 hover:decoration-text-primary"
            >
              hello@gigawattmap.com
            </a>
            .
          </p>
        </Section>

        <Section id="team" title="Team">
          <p>
            Sudhendra Kambhamettu, lead. The project is open to collaborators who want to own a
            data source, a region, or a methodology question — see the GitHub issues tagged{' '}
            <code className="font-mono text-sm text-text-muted">help-wanted</code>.
          </p>
        </Section>

        <Section id="press" title="Press &amp; citations">
          <p className="text-text-muted">
            None yet. When coverage appears, it will be listed here with a link to the original.
          </p>
        </Section>

        <Section id="licensing" title="Licensing">
          <p>
            Code is released under the{' '}
            <a
              href="https://opensource.org/license/mit"
              target="_blank"
              rel="noreferrer"
              className="font-mono text-text-primary underline decoration-text-subtle underline-offset-2 hover:decoration-text-primary"
            >
              MIT license
            </a>
            . Data retains the license of its upstream source, listed in the inventory above.
            Attribution is required when redistributing any layer — the attribution string for
            each source is embedded in the corresponding{' '}
            <code className="font-mono text-sm text-text-muted">manifest.json</code> entry.
          </p>
        </Section>

        <footer className="mt-16 border-t border-bg-elevated pt-6 font-mono text-xs uppercase tracking-widest text-text-subtle">
          <Link href="/" className="hover:text-text-primary">
            ← Back to map
          </Link>
        </footer>
      </main>
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section id={id} className="mb-12 scroll-mt-16">
      <h2 className="mb-4 font-sans text-2xl font-semibold tracking-tight text-text-primary">
        {title}
      </h2>
      <div className="space-y-4 text-base leading-relaxed text-text-primary/90">{children}</div>
    </section>
  );
}
