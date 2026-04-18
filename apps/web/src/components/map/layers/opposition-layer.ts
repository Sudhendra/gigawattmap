import { TextLayer } from '@deck.gl/layers';
import type { Feature, FeatureCollection, Point } from 'geojson';

/**
 * Properties carried by opposition-fight features emitted by
 * `opendc.sources.opposition`. Mirrors :class:`OppositionFight` in the
 * Python schema but flattened — geometry lives at the Feature level.
 *
 * Most fields are nullable because the upstream tracker is community-
 * edited; older rows from the SSRN moratorium dataset only carry
 * jurisdiction + summary, while recent rows include MW, $, and a full
 * `opposition_groups` roster.
 */
export type OppositionFightProperties = {
  id: string;
  project_name: string | null;
  company: string | null;
  hyperscaler: string | null;
  jurisdiction: string;
  state: string;
  county: string | null;
  status: string;
  community_outcome: string;
  action_type: string[];
  issue_category: string[];
  summary: string | null;
  megawatts: number | null;
  investment_million_usd: number | null;
  opposition_groups: string[];
  sources: string[];
  date: string | null;
  last_updated: string | null;
  data_source: string;
  geocode_confidence: 'upstream' | 'high' | 'medium' | 'low';
};

export type OppositionFightFeature = Feature<Point, OppositionFightProperties>;
export type OppositionFightCollection = FeatureCollection<
  Point,
  OppositionFightProperties
>;

/**
 * Color tokens hand-mirrored from `globals.css` (`--status-blocked` =
 * `#ef5350`). Kept inline rather than parsed from CSS at runtime because
 * deck.gl needs RGBA tuples and reading + parsing computed CSS for every
 * frame would torch the perf budget.
 *
 * The two outcomes get distinct opacities: ``defeated`` (community win)
 * sits at full intensity, everything else at 70% so the visualization
 * answers "where has community pushback succeeded?" at a glance.
 */
const COLOR_DEFEATED: [number, number, number, number] = [239, 83, 80, 240];
const COLOR_OTHER: [number, number, number, number] = [239, 83, 80, 175];

const X_GLYPH = '\u2715'; // ✕ — Multiplication X. Unambiguously read as a marker.

function colorFor(
  status: string,
  outcome: string,
): [number, number, number, number] {
  if (status === 'defeated' || outcome === 'win') return COLOR_DEFEATED;
  return COLOR_OTHER;
}

export type CreateOppositionLayerOptions = {
  /** Click handler. Receives the GeoJSON feature for card population. */
  onClick?: (feature: OppositionFightFeature) => void;
  /** Whether the layer is rendered. Defaults to true. */
  visible?: boolean;
};

/**
 * Build a deck.gl :class:`TextLayer` rendering opposition fights as red
 * ``✕`` glyphs. Distinct from the campus dots (filled circles) by both
 * shape and color, so the two layers read as separate phenomena even at
 * a glance. Pickability is opt-in per glyph so clicks always land on the
 * intended fight.
 */
export function createOppositionLayer(
  data: OppositionFightCollection,
  options: CreateOppositionLayerOptions = {},
): TextLayer<OppositionFightFeature> {
  const { onClick, visible = true } = options;
  return new TextLayer<OppositionFightFeature>({
    id: 'opposition',
    data: data.features,
    visible,
    pickable: true,
    sizeUnits: 'pixels',
    getText: () => X_GLYPH,
    getPosition: (f) => {
      const [lon, lat] = f.geometry.coordinates;
      return [lon ?? 0, lat ?? 0];
    },
    getSize: 16,
    getColor: (f) =>
      colorFor(f.properties.status, f.properties.community_outcome),
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontWeight: 700,
    // Outline keeps the X readable over the dark basemap regardless of
    // the underlying tile color (water vs land vs label halo).
    outlineWidth: 2,
    outlineColor: [10, 12, 16, 220],
    fontSettings: { sdf: true },
    onClick: ({ object }) => {
      if (object && onClick) onClick(object as OppositionFightFeature);
    },
  });
}
