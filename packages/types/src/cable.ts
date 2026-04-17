import type { Geometry } from 'geojson';

/** A submarine cable landing point (city + country pair). */
export type CableLanding = {
  name: string;
  country: string;
  /** [longitude, latitude] in EPSG:4326. */
  coordinates: [number, number];
};

/**
 * A submarine telecom cable. Sourced from TeleGeography Submarine Cable Map
 * (CC BY-NC-SA 3.0 — non-commercial use only; see SPEC §6.3).
 */
export type Cable = {
  /** TeleGeography slug, e.g. "marea". */
  id: string;
  name: string;
  length_km: number | null;
  /** Design capacity in terabits per second; null when undisclosed. */
  capacity_tbps: number | null;
  landing_points: CableLanding[];
  /** LineString or MultiLineString of the cable route. */
  geometry: Geometry;
  /** Year ready-for-service; null for under-construction or planned cables. */
  rfs_year: number | null;
};
