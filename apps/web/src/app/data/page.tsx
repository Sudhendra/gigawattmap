import Link from 'next/link';
import { AppHeader } from '@/components/app-header';
import { MANIFEST_URL } from '@/lib/env';
import {
  type Manifest,
  fetchManifest,
  groupArtifactsBySource,
} from '@/lib/manifest';
import { ArtifactRow } from './_components/artifact-row';

export const metadata = {
  title: 'Data — Gigawatt Map',
  description:
    'Download the full Gigawatt Map dataset: datacenters, power plants, submarine cables, cloud regions, and more. Open data, source-by-source licensing, JSON + CSV.',
};

// Cache the manifest fetch for the lifetime of the build. The page is
// statically rendered; revalidation happens on the next deploy.
export const revalidate = false;

const SOURCE_LABELS: Record<string, string> = {
  datacenters: 'Datacenters',
  powerplants: 'Power plants',
  cables: 'Submarine cables',
  'landing-points': 'Cable landing points',
  'cloud-regions': 'Cloud regions',
  opposition: 'Citizen opposition',
  announcements: 'Announcements',
};

const SOURCE_BLURBS: Record<string, string> = {
  datacenters:
    'Curated AI campuses merged with OpenStreetMap datacenter polygons. Confidence tier on every record.',
  powerplants:
    'Global Energy Monitor: every utility-scale power plant on Earth, with capacity, status, and fuel type.',
  cables:
    'TeleGeography submarine cable map. Non-commercial use only — do not ship in a paid product.',
  'landing-points':
    'TeleGeography submarine cable landing points. Same non-commercial license as the cables themselves.',
  'cloud-regions':
    'AWS, Azure, and GCP region locations. Mostly hand-curated from each provider’s public docs.',
  opposition:
    'Local opposition campaigns sourced from Data Center Watch and reviewed for primary citation.',
  announcements:
    'Operator capex announcements with source URL and date. Hand-curated; treat as a reading list, not a feed.',
};

async function loadManifest(): Promise<Manifest | null> {
  if (!MANIFEST_URL) return null;
  try {
    return await fetchManifest(MANIFEST_URL);
  } catch (err) {
    // Don't block a deploy on a transient R2 hiccup; render the empty
    // state and let CI alert on the publish job's exit code instead.
    console.error('failed to fetch manifest at build time', err);
    return null;
  }
}

export default async function DataPage(): Promise<React.JSX.Element> {
  const manifest = await loadManifest();
  const groups = manifest ? groupArtifactsBySource(manifest) : [];

  return (
    <div className="min-h-screen bg-bg-base">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-accent-focus focus:px-3 focus:py-2 focus:font-mono focus:text-xs focus:text-bg-base"
      >
        Skip to content
      </a>
      <AppHeader />
      <main
        id="main"
        className="mx-auto w-full max-w-[80ch] px-4 py-12 font-serif text-text-primary md:py-16"
      >
        <header className="mb-10 border-b border-bg-elevated pb-8">
          <h1 className="font-sans text-3xl font-semibold tracking-tight md:text-4xl">
            Data
          </h1>
          <p className="mt-3 font-serif text-base text-text-muted">
            Every layer on the map is downloadable as GeoJSON or CSV. Files are served from
            Cloudflare R2 with permissive caching. The same data is available behind a public
            JSON API — see the{' '}
            <Link href="/data/api" className="underline decoration-text-subtle underline-offset-2 hover:decoration-text-primary">
              API docs
            </Link>
            .
          </p>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-widest text-text-subtle">
            Source code:{' '}
            <a
              href="https://github.com/anomalyco/gigawattmap"
              target="_blank"
              rel="noreferrer"
              className="text-text-muted hover:text-text-primary"
            >
              github.com/anomalyco/gigawattmap
            </a>
          </p>
          {manifest?.updated_at && (
            <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-text-subtle">
              Manifest updated <span className="tabular">{manifest.updated_at}</span>
            </p>
          )}
        </header>

        <section className="mb-10 rounded border border-bg-elevated bg-bg-panel px-5 py-4 font-serif text-sm text-text-muted">
          <h2 className="mb-2 font-sans text-sm font-semibold uppercase tracking-widest text-text-primary">
            Before you use this data
          </h2>
          <ul className="space-y-2 text-[13px]">
            <li>
              <strong className="text-text-primary">Attribution is required.</strong>{' '}
              Each row lists the upstream attribution string. Reproduce it in any redistribution.
            </li>
            <li>
              <strong className="text-status-blocked">Cables data is non-commercial.</strong>{' '}
              TeleGeography licenses under CC BY-NC-SA 3.0. If you ship a paid product or
              advertising-funded service, do not include it.
            </li>
            <li>
              <strong className="text-status-construction">ODbL data is share-alike.</strong>{' '}
              OpenStreetMap-derived rows require derivative datasets to use the same license.
            </li>
          </ul>
        </section>

        {groups.length === 0 ? (
          <p className="rounded border border-dashed border-bg-elevated bg-bg-panel px-5 py-8 text-center font-mono text-sm text-text-muted">
            Manifest unavailable. Set <code>NEXT_PUBLIC_MANIFEST_URL</code> and rebuild.
          </p>
        ) : (
          <div className="space-y-10">
            {groups.map((group) => (
              <section key={group.source}>
                <h2 className="mb-1 font-sans text-xl font-semibold tracking-tight">
                  {SOURCE_LABELS[group.source] ?? group.source}
                </h2>
                <p className="mb-4 font-serif text-sm text-text-muted">
                  {SOURCE_BLURBS[group.source] ?? ''}
                </p>
                <ul className="overflow-hidden rounded border border-bg-elevated bg-bg-panel">
                  {group.artifacts.map((artifact) => (
                    <ArtifactRow key={artifact.filename} artifact={artifact} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
