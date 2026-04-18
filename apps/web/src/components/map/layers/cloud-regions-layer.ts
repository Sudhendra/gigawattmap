import { ScatterplotLayer } from '@deck.gl/layers';
import type { Feature, FeatureCollection, Point } from 'geojson';
import {
  CLOUD_PROVIDER_COLORS,
  CLOUD_PROVIDER_STROKE,
  type CloudProvider,
} from '@/lib/colors';

/**
 * Properties carried by cloud-region features emitted by
 * `opendc.sources.cloud_regions`. Mirrors `CloudRegion` in the Python
 * schema: provider/code/display_name/country/launch_year/services/
 * source_url. Kept narrow; we only render what users see in the popover.
 */
export type CloudRegionProperties = {
  provider: CloudProvider;
  code: string;
  display_name: string;
  country: string;
  launch_year: number | null;
  services: string[] | null;
  source_url: string;
};

export type CloudRegionFeature = Feature<Point, CloudRegionProperties>;
export type CloudRegionCollection = FeatureCollection<Point, CloudRegionProperties>;

/**
 * Buffer radius rendered around each region centroid. 10 km is a
 * deliberate visual cue: it's larger than any single building but
 * smaller than a metro area, communicating "approximate location"
 * rather than "exact site".
 */
const BUFFER_RADIUS_METERS = 10_000;
const MIN_PIXELS = 4; // keep dots tappable when fully zoomed out
const MAX_PIXELS = 28; // and from blooming when zoomed in close

function fillForProvider(p: CloudProvider): [number, number, number, number] {
  return CLOUD_PROVIDER_COLORS[p] ?? [138, 148, 168, 70];
}

function strokeForProvider(p: CloudProvider): [number, number, number, number] {
  return CLOUD_PROVIDER_STROKE[p] ?? [138, 148, 168, 220];
}

export type CreateCloudRegionsLayerOptions = {
  /** Called when a region is clicked. Receives the GeoJSON feature. */
  onClick?: (feature: CloudRegionFeature) => void;
  /** Whether the layer is rendered. Defaults to true. */
  visible?: boolean;
  /**
   * Cloud providers that should remain fully lit when a ticker filter is
   * active. Empty/null disables filtering. See ticker-map.ts for the
   * editorial mapping that produces this set.
   */
  highlightProviders?: ReadonlySet<CloudProvider> | null;
};

const DIMMED_ALPHA = 32;

function dimRgba(
  rgba: [number, number, number, number],
): [number, number, number, number] {
  return [rgba[0], rgba[1], rgba[2], DIMMED_ALPHA];
}

/**
 * Build a deck.gl ScatterplotLayer for cloud-provider region centroids.
 * Renders each region as a translucent buffer circle (10 km radius in
 * map space, clamped in pixel space) outlined by the provider's brand
 * color. Pure factory — no React, no DOM access.
 */
export function createCloudRegionsLayer(
  data: CloudRegionCollection,
  options: CreateCloudRegionsLayerOptions = {},
): ScatterplotLayer<CloudRegionFeature> {
  const { onClick, visible = true, highlightProviders = null } = options;
  const filterActive =
    highlightProviders !== null && highlightProviders.size > 0;
  return new ScatterplotLayer<CloudRegionFeature>({
    id: 'cloud-regions',
    data: data.features,
    visible,
    pickable: true,
    stroked: true,
    filled: true,
    radiusUnits: 'meters',
    radiusMinPixels: MIN_PIXELS,
    radiusMaxPixels: MAX_PIXELS,
    lineWidthUnits: 'pixels',
    updateTriggers: {
      getFillColor: filterActive ? Array.from(highlightProviders ?? []) : null,
      getLineColor: filterActive ? Array.from(highlightProviders ?? []) : null,
    },
    getPosition: (f) => {
      const [lon, lat] = f.geometry.coordinates;
      return [lon ?? 0, lat ?? 0];
    },
    getRadius: () => BUFFER_RADIUS_METERS,
    getFillColor: (f) => {
      const base = fillForProvider(f.properties.provider);
      if (!filterActive) return base;
      return highlightProviders?.has(f.properties.provider)
        ? base
        : dimRgba(base);
    },
    getLineColor: (f) => {
      const base = strokeForProvider(f.properties.provider);
      if (!filterActive) return base;
      return highlightProviders?.has(f.properties.provider)
        ? base
        : dimRgba(base);
    },
    getLineWidth: () => 1.5,
    onClick: ({ object }) => {
      if (object && onClick) onClick(object as CloudRegionFeature);
    },
  });
}
