import { ScatterplotLayer } from '@deck.gl/layers';
import type { Feature, FeatureCollection, Point } from 'geojson';
import type { DatacenterTier, DatacenterStatus } from '@gigawattmap/types';
import { TIER_COLORS, TIER_COLOR_FALLBACK } from '@/lib/colors';

/**
 * Properties carried by the seed AI-campus features. Mirrors the schema
 * defined in `public/seed/ai-campuses.geojson`. This is intentionally
 * narrower than the canonical `Datacenter` type — the seed is a
 * placeholder until the Python pipeline lands (tasks 010-014).
 */
export type AiCampusProperties = {
  id: string;
  name: string;
  operator: string;
  tenant: string;
  tier: DatacenterTier;
  est_mw_mid: number;
  status: DatacenterStatus;
  country: string;
  /** Substation enrichment from task 017. Null when no substation is within 10 km. */
  nearest_substation_id?: string | null;
  nearest_substation_distance_km?: number | null;
  nearest_substation_voltage_kv?: number | null;
};

export type AiCampusFeature = Feature<Point, AiCampusProperties>;
export type AiCampusCollection = FeatureCollection<Point, AiCampusProperties>;

/**
 * Pixel radius scales with sqrt(MW) so a 5,000 MW campus reads as visibly
 * larger than a 50 MW one without dwarfing the map. Clamped to keep tiny
 * sites tappable and giant sites from becoming blobs.
 */
const MIN_RADIUS_PX = 5;
const MAX_RADIUS_PX = 22;
function radiusForMw(mw: number): number {
  if (!Number.isFinite(mw) || mw <= 0) return MIN_RADIUS_PX;
  const r = Math.sqrt(mw) * 0.45;
  return Math.min(MAX_RADIUS_PX, Math.max(MIN_RADIUS_PX, r));
}

function colorForTier(tier: DatacenterTier | undefined): [number, number, number, number] {
  if (tier && tier in TIER_COLORS) return TIER_COLORS[tier];
  return TIER_COLOR_FALLBACK;
}

export type CreateDatacentersLayerOptions = {
  /** Called when a dot is clicked. The drawer wiring lands in task 006. */
  onClick?: (feature: AiCampusFeature) => void;
  /** Id of the currently selected feature, if any — drawn with a focus ring. */
  selectedId?: string | null;
  /** Whether the layer is rendered. Defaults to true. */
  visible?: boolean;
};

/**
 * Build a deck.gl ScatterplotLayer for AI campus points. Pure factory —
 * accepts the GeoJSON collection plus optional click handler and returns
 * a fresh layer instance the caller can hand to `MapboxOverlay`.
 */
export function createDatacentersLayer(
  data: AiCampusCollection,
  options: CreateDatacentersLayerOptions = {},
): ScatterplotLayer<AiCampusFeature> {
  const { selectedId = null, onClick, visible = true } = options;
  return new ScatterplotLayer<AiCampusFeature>({
    id: 'ai-campuses',
    data: data.features,
    visible,
    pickable: true,
    stroked: true,
    filled: true,
    radiusUnits: 'pixels',
    lineWidthUnits: 'pixels',
    // Force a re-render when selection changes — deck.gl shallow-compares
    // accessor outputs, so we tag the props.
    updateTriggers: {
      getLineColor: selectedId,
      getLineWidth: selectedId,
    },
    getPosition: (f) => {
      const [lon, lat] = f.geometry.coordinates;
      // Coordinates are validated when the seed file is parsed (every feature
      // is a Point with two finite numbers). The cast satisfies deck.gl's
      // strict tuple type given our `noUncheckedIndexedAccess` setting.
      return [lon ?? 0, lat ?? 0];
    },
    getRadius: (f) => radiusForMw(f.properties.est_mw_mid),
    getFillColor: (f) => colorForTier(f.properties.tier),
    getLineColor: (f) =>
      f.properties.id === selectedId
        ? [255, 235, 59, 255] // --accent-focus
        : [10, 13, 18, 220], // --bg-base, near-opaque, default rim
    getLineWidth: (f) => (f.properties.id === selectedId ? 3 : 1),
    onClick: ({ object }) => {
      if (object && onClick) onClick(object as AiCampusFeature);
    },
  });
}
