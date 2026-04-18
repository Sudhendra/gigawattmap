import { PathLayer } from '@deck.gl/layers';
import { TripsLayer } from '@deck.gl/geo-layers';
import type { CompositeLayer } from '@deck.gl/core';
import type { Feature, FeatureCollection, MultiLineString } from 'geojson';

/**
 * Properties carried by submarine-cable features emitted by
 * `opendc.sources.telegeography`. Mirrors :class:`Cable` in the Python
 * schema but flattened — geometry lives at the Feature level. All metric
 * fields are nullable because TeleGeography reports them inconsistently
 * across the dataset (newer cables disclose more than older ones).
 */
export type CableLandingPoint = {
  name: string;
  country: string;
  coordinates: [number, number];
};

export type CableProperties = {
  id: string;
  name: string;
  length_km: number | null;
  capacity_tbps: number | null;
  rfs_year: number | null;
  landing_points: CableLandingPoint[];
};

export type CableFeature = Feature<MultiLineString, CableProperties>;
export type CableCollection = FeatureCollection<MultiLineString, CableProperties>;

/**
 * Per-segment row passed to deck.gl. We flatten each cable's
 * MultiLineString into one row per LineString so deck.gl receives a
 * uniform ``Path`` shape — TripsLayer cannot consume MultiLineStrings
 * directly. Each segment's timestamps span ``[phase, phase + LOOP_MS]``
 * where ``phase`` is a deterministic hash of the cable id, so cables
 * don't all pulse in unison. The trail layer drives a single
 * monotonically-increasing ``currentTime``; cables become visible as
 * the clock crosses their phase, then re-cycle once per ``LOOP_MS``.
 */
type CableSegment = {
  cableId: string;
  cableName: string;
  /** Polyline as [lon, lat] vertex pairs. */
  path: [number, number][];
  /** Per-vertex timestamps in ms within `[phase, phase + LOOP_MS]`. */
  timestamps: number[];
  /** Back-pointer to the original feature for click payloads. */
  feature: CableFeature;
};

/** Particle loop length. 8 s per the task card; tunable in one place. */
const LOOP_MS = 8_000;
/** Trail length as a fraction of LOOP_MS — short trails read as particles. */
const TRAIL_MS = 1_400;

/**
 * Cable color tokens hand-mirrored from `globals.css`
 * (``--accent-cable`` = ``#00e5ff``). Two opacities: the static base
 * line stays subtle, the animated trail pops to read as motion. Values
 * are inlined because deck.gl needs RGBA tuples on the hot path.
 */
const COLOR_BASE: [number, number, number, number] = [0, 229, 255, 60];
const COLOR_TRAIL: [number, number, number, number] = [0, 229, 255, 230];

/**
 * Deterministic phase offset in [0, LOOP_MS) derived from a cable id.
 * Hash so that re-renders don't reshuffle the visual cadence; the goal
 * is ambient motion, not a strobe. djb2-ish folding.
 */
function phaseForCableId(id: string): number {
  let h = 5381;
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) + h + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % LOOP_MS;
}

/**
 * Flatten a CableCollection into one segment per LineString. Cables
 * crossing the antimeridian arrive as separate LineStrings in the
 * source GeoJSON (TeleGeography pre-splits them), so a per-LineString
 * row is also the right wrapping unit for deck.gl's ``wrapLongitude``.
 */
function toSegments(data: CableCollection): CableSegment[] {
  const out: CableSegment[] = [];
  for (const feature of data.features) {
    const phaseMs = phaseForCableId(feature.properties.id);
    for (const line of feature.geometry.coordinates) {
      // Defensive: filter to numeric [lon, lat] pairs in case a vertex
      // arrives with an elevation or with NaN from upstream.
      const path: [number, number][] = [];
      for (const v of line) {
        const lon = v[0];
        const lat = v[1];
        if (typeof lon === 'number' && typeof lat === 'number') {
          path.push([lon, lat]);
        }
      }
      if (path.length < 2) continue;
      // Evenly spaced timestamps shifted by `phaseMs`. Real pixel speed
      // varies with cable length — short cables animate fast, long
      // cables slow — which reads as honest scale rather than a
      // normalized lie.
      const n = path.length;
      const timestamps: number[] = new Array<number>(n);
      for (let i = 0; i < n; i++) {
        timestamps[i] = phaseMs + (i / (n - 1)) * LOOP_MS;
      }
      out.push({
        cableId: feature.properties.id,
        cableName: feature.properties.name,
        path,
        timestamps,
        feature,
      });
    }
  }
  return out;
}

export type CreateCablesLayersOptions = {
  /** Click handler. Receives the GeoJSON feature for card population. */
  onClick?: (feature: CableFeature) => void;
  /** Whether the layers are rendered. Defaults to true. */
  visible?: boolean;
  /**
   * Animation clock in milliseconds. Owners should pass ``null`` to
   * disable animation entirely (e.g. when ``prefers-reduced-motion``
   * is set); the base PathLayer will still render so the cables remain
   * visible as static lines.
   */
  currentTimeMs?: number | null;
};

/**
 * Build the two cable layers as a stable tuple. Returning a tuple
 * (rather than a single CompositeLayer) lets the caller order the
 * cables relative to other deck layers without wrapping them in a
 * group. Index 0 is the static base line; index 1 is the animated
 * trail (omitted when ``currentTimeMs`` is null).
 *
 * Memoization is the caller's responsibility — segments are recomputed
 * on every call. The map.tsx effect already memoizes per-data identity.
 */
export function createCablesLayers(
  data: CableCollection,
  options: CreateCablesLayersOptions = {},
): CompositeLayer[] {
  const { onClick, visible = true, currentTimeMs = null } = options;
  const segments = toSegments(data);

  // Base layer is always present — it owns clicks + tooltips so the
  // animated layer doesn't need to be pickable (cheaper raycast).
  const base = new PathLayer<CableSegment>({
    id: 'cables-base',
    data: segments,
    visible,
    pickable: true,
    widthUnits: 'pixels',
    widthMinPixels: 1,
    getWidth: () => 1.25,
    getPath: (s) => s.path,
    getColor: () => COLOR_BASE,
    capRounded: true,
    jointRounded: true,
    // Cables routinely cross the antimeridian; let deck.gl handle the
    // wrap so the geometry doesn't draw a giant horizontal artifact.
    wrapLongitude: true,
    onClick: ({ object }) => {
      if (object && onClick) onClick((object as CableSegment).feature);
    },
  }) as unknown as CompositeLayer;

  if (currentTimeMs == null) {
    return [base];
  }

  // Trail layer: animated particles along each cable. Each segment's
  // local time = (clock - phase) mod loop, so cables start at
  // staggered offsets and advance independently. TripsLayer fades the
  // trail behind currentTime over `trailLength`.
  const trail = new TripsLayer<CableSegment>({
    id: 'cables-trail',
    data: segments,
    visible,
    pickable: false,
    widthUnits: 'pixels',
    widthMinPixels: 1,
    getWidth: () => 2,
    getPath: (s) => s.path,
    getTimestamps: (s) => s.timestamps,
    getColor: () => COLOR_TRAIL,
    capRounded: true,
    jointRounded: true,
    fadeTrail: true,
    trailLength: TRAIL_MS,
    // currentTime is one global clock (ms) advancing through
    // ``[0, 2 * LOOP_MS)``. Max segment timestamp is
    // ``LOOP_MS + maxPhase < 2 * LOOP_MS``, so wrapping at ``2*LOOP``
    // means every cable's window fits inside one cycle.
    currentTime: currentTimeMs % (2 * LOOP_MS),
    wrapLongitude: true,
    // currentTime is the only animated prop; tell deck.gl to re-evaluate
    // it without diffing the (large) data array on every frame.
    updateTriggers: {
      currentTime: currentTimeMs,
    },
  }) as unknown as CompositeLayer;

  return [base, trail];
}
