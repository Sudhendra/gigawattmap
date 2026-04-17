import type { Geometry } from 'geojson';

/**
 * Primary fuel of a power plant. Mirrors GEM/WRI fuel buckets,
 * collapsed to the categories surfaced in the legend.
 */
export type FuelType =
  | 'coal'
  | 'gas'
  | 'nuclear'
  | 'solar'
  | 'wind'
  | 'hydro'
  | 'storage'
  | 'other';

/**
 * A power-generation facility. Sourced primarily from
 * Global Energy Monitor (GIPT), backfilled with WRI GPPD and EIA-860.
 */
export type PowerPlant = {
  /** Stable slug-style id, prefixed by source, e.g. "gem-10293". */
  id: string;
  name: string;
  fuel_type: FuelType;
  /** Nameplate capacity in megawatts. */
  capacity_mw: number;
  geometry: Geometry;
  operator: string | null;
  /** First commercial year of operation; null when unknown. */
  commissioning_year: number | null;
  /** Origin dataset, e.g. "gem", "wri-gppd", "eia-860". */
  source: string;
};
