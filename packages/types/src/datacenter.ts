import type { Geometry } from 'geojson';

/**
 * Coarse classification of a datacenter operator/use-case.
 * - hyperscale: AWS/Azure/GCP/Meta/Oracle owned-and-operated mega-campuses
 * - colo: multi-tenant colocation (Equinix, Digital Realty, etc.)
 * - neocloud: AI-specialist clouds (CoreWeave, Nebius, Lambda, Nscale)
 * - enterprise: single-occupant private DCs
 */
export type DatacenterTier = 'hyperscale' | 'colo' | 'neocloud' | 'enterprise';

/** Lifecycle status of a facility. */
export type DatacenterStatus = 'operational' | 'construction' | 'announced' | 'blocked';

/**
 * Provenance of the MW estimate, in order of decreasing trust:
 * - announcement: operator-disclosed nameplate or press-release figure
 * - utility-filing: from a public utility filing (PJM/ERCOT queue, FERC, etc.)
 * - estimate: derived from sqft via the heuristic in SPEC §6.1
 */
export type MwSource = 'announcement' | 'utility-filing' | 'estimate';

/**
 * Confidence badge surfaced in the UI for each facility.
 * - verified: cross-checked against >=2 independent sources
 * - osm_only: present in OSM but no corroborating source
 * - press_release: from a single press release / 8-K
 * - estimated: derived attribute (e.g. MW from sqft) only
 */
export type Confidence = 'verified' | 'osm_only' | 'press_release' | 'estimated';

/**
 * A single datacenter facility (campus or building).
 *
 * `geometry` may be a Point (low-confidence sites) or a Polygon/MultiPolygon
 * (campuses with mapped footprints). Always GeoJSON in EPSG:4326.
 */
export type Datacenter = {
  /** Stable slug-style id, e.g. "crusoe-abilene-tx". */
  id: string;
  name: string;
  /** FK to Operator.id; null when operator is unknown. */
  operator_id: string | null;
  tier: DatacenterTier;
  status: DatacenterStatus;
  geometry: Geometry;
  /** Lower bound of estimated IT load in megawatts. */
  est_mw_low: number | null;
  /** Midpoint estimate; null when range cannot be computed. */
  est_mw_mid: number | null;
  /** Upper bound of estimated IT load in megawatts. */
  est_mw_high: number | null;
  mw_source: MwSource | null;
  /** ISO 3166-1 alpha-2 country code, e.g. "US". */
  country: string;
  /** ISO 3166-2 subdivision (state/province) code, e.g. "US-TX". */
  region: string | null;
  /** Source URLs that contributed to this record (OSM, IM3, press, etc.). */
  sources: string[];
  confidence: Confidence;
};
