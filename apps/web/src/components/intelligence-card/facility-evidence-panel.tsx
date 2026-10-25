import type { AiCampusProperties } from '@/components/map/layers/datacenters-layer';
import { facilityEvidence, publicationLabel } from './facility-evidence';

type Props = { properties: AiCampusProperties; publishedAt: string | null };

export function FacilityEvidencePanel({ properties, publishedAt }: Props): React.JSX.Element {
  const evidence = facilityEvidence(properties);
  const oldSnapshot =
    publishedAt &&
    Number.isFinite(Date.parse(publishedAt)) &&
    Date.now() - Date.parse(publishedAt) > 14 * 86400_000;
  return (
    <section
      aria-label="Data and evidence"
      className="mb-5 rounded-lg border border-[var(--border-subtle)] bg-bg-base/40 p-3"
    >
      <h3 className="text-sm font-medium">Data & evidence</h3>
      <p className="mt-1 text-xs text-[var(--accent-focus)]">{evidence.provenance}</p>
      <dl className="mt-3 space-y-2 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-text-muted">Operator</dt>
          <dd>{evidence.operatorKnown ? 'Recorded, not independently verified' : 'Unknown'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-text-muted">Status</dt>
          <dd>{evidence.statusKnown ? 'Reported, not independently verified' : 'Unknown'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-text-muted">Capacity</dt>
          <dd>{evidence.capacityKnown ? 'Estimate' : 'Unknown'}</dd>
        </div>
      </dl>
      {evidence.capacityKnown && (
        <p className="mt-3 text-[11px] leading-relaxed text-text-muted">
          The MW value is an estimate, not measured operating load. Its method and uncertainty range
          are not included in this snapshot.
        </p>
      )}
      <div className="mt-3 border-t border-white/10 pt-3 text-xs">
        <p className="text-text-muted">Facility last verified</p>
        <p className="mt-1">Not recorded</p>
        <p className="mt-3 text-text-muted">Dataset published</p>
        <p className="mt-1" title={publishedAt ?? undefined}>
          {publicationLabel(publishedAt)}
        </p>
        {oldSnapshot && (
          <p className="mt-2 text-[var(--status-construction)]">
            Dataset publication is more than 14 days old.
          </p>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-text-muted">
          An automated refresh updates the dataset. It does not verify each facility’s current
          status, capacity or editorial claims.
        </p>
      </div>
      <div className="mt-3 space-y-2 text-xs">
        {evidence.links.map((link) => (
          <a
            className="block text-[var(--accent-focus)] underline underline-offset-2"
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noreferrer"
          >
            {link.label} ↗
          </a>
        ))}
        {!evidence.links.length && (
          <p className="text-text-muted">No facility-level source link supplied.</p>
        )}
      </div>
      {properties.sources?.includes('osm') && (
        <p className="mt-3 text-[10px] text-text-muted">
          © OpenStreetMap contributors · ODbL. Community-maintained coverage.
        </p>
      )}
      {properties.sources?.includes('curated') && (
        <p className="mt-2 text-[10px] text-text-muted">
          Curated editorial details may predate this dataset publication.
        </p>
      )}
    </section>
  );
}
