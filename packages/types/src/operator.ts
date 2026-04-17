import type { DatacenterTier } from './datacenter.js';

/**
 * A datacenter operator (owner-operator, colo, neocloud, hyperscaler).
 * `ticker` is set when the parent company is publicly listed and drives
 * the Ticker Panel cross-filter (SPEC §2 v1.C).
 */
export type Operator = {
  /** Stable slug, e.g. "meta", "equinix", "crusoe". */
  id: string;
  name: string;
  /** Public ticker (e.g. "META"); null for private operators. */
  ticker: string | null;
  tier: DatacenterTier;
  /** ISO 3166-1 alpha-2 country code of headquarters. */
  headquarters_country: string;
};

/** Toggleable map layer ids — keep in sync with apps/web layer controls. */
export type LayerId =
  | 'datacenters'
  | 'cables'
  | 'powerplants'
  | 'opposition'
  | 'cloud_regions'
  | 'water_stress';
