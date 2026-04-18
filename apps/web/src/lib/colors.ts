import type { DatacenterTier } from '@gigawattmap/types';

/**
 * RGBA tuples for each datacenter tier. Hex values mirror the CSS variables
 * `--dc-*` defined in `app/globals.css`, which in turn mirror SPEC §5.
 * Kept in sync by hand — if you change one, change both. We don't read CSS
 * vars at runtime because deck.gl needs concrete RGBA arrays for GPU upload
 * and we want this work to happen without touching the DOM.
 */
export const TIER_COLORS: Record<DatacenterTier, [number, number, number, number]> = {
  hyperscale: [255, 183, 77, 230], // #ffb74d
  colo: [100, 181, 246, 230], // #64b5f6
  neocloud: [186, 104, 200, 230], // #ba68c8
  enterprise: [120, 144, 156, 230], // #78909c
};

/** Fallback used when a feature lacks a recognised tier. */
export const TIER_COLOR_FALLBACK: [number, number, number, number] = [138, 148, 168, 200];

/**
 * Cloud-provider brand colors used to fill region buffer circles. The
 * alpha is intentionally low (~70/255) because the circles are rendered
 * as fills covering ~10 km of map — opaque buffers would dominate the
 * underlying datacenter/grid layers. Mirror of the `--cloud-*` CSS vars
 * in `app/globals.css`.
 */
export type CloudProvider = 'aws' | 'azure' | 'gcp' | 'oracle' | 'alibaba';

export const CLOUD_PROVIDER_COLORS: Record<CloudProvider, [number, number, number, number]> = {
  aws: [255, 153, 0, 70], // #ff9900
  azure: [0, 120, 212, 70], // #0078d4
  gcp: [66, 133, 244, 70], // #4285f4
  oracle: [248, 0, 0, 70], // #f80000
  alibaba: [255, 106, 0, 70], // #ff6a00
};

/** Stroke version of the same palette: opaque, for ring outlines. */
export const CLOUD_PROVIDER_STROKE: Record<CloudProvider, [number, number, number, number]> = {
  aws: [255, 153, 0, 220],
  azure: [0, 120, 212, 220],
  gcp: [66, 133, 244, 220],
  oracle: [248, 0, 0, 220],
  alibaba: [255, 106, 0, 220],
};
