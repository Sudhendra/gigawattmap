import type { AiCampusProperties } from '@/components/map/layers/datacenters-layer';

export type EvidenceLink = { label: string; url: string };
export type FacilityEvidence = {
  provenance: string;
  links: EvidenceLink[];
  operatorKnown: boolean;
  statusKnown: boolean;
  capacityKnown: boolean;
};

export function safeEvidenceUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function facilityEvidence(p: AiCampusProperties): FacilityEvidence {
  const osm = p.sources?.includes('osm') ?? false;
  const curated = p.sources?.includes('curated') ?? false;
  const links: EvidenceLink[] = [];
  const citation = safeEvidenceUrl(p.source_url);
  if (citation) links.push({ label: 'Recorded source citation', url: citation });
  const match = /^osm-(node|way|relation)-(\d+)$/.exec(p.id);
  if (osm && match) {
    const url = `https://www.openstreetmap.org/${match[1]}/${match[2]}`;
    if (!links.some((link) => link.url === url)) links.push({ label: 'OpenStreetMap record', url });
  }
  return {
    provenance:
      osm && curated
        ? 'Curated details + OpenStreetMap geometry'
        : osm
          ? 'OpenStreetMap record'
          : curated
            ? 'Curated record'
            : 'Source attribution not recorded',
    links,
    operatorKnown:
      !!p.operator.trim() && !['unknown', 'unspecified'].includes(p.operator.toLowerCase()),
    statusKnown: p.status !== null,
    capacityKnown: p.est_mw_mid !== null && Number.isFinite(p.est_mw_mid) && p.est_mw_mid >= 0,
  };
}

/** Publication is a dataset timestamp, never a facility verification date. */
export function publicationLabel(value: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Not available';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(new Date(value));
}
