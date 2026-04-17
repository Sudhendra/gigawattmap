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
