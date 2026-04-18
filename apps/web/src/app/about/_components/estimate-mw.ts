/**
 * Worked-example calculator mirroring the Python `estimate_mw` heuristic
 * in `data-pipeline/opendc/`. We ship a TypeScript port solely so the
 * `/about` methodology section can render a live calculation the reader
 * can sanity-check, not for production use — the pipeline is the source
 * of truth. Keep this in lockstep with `SPEC.md §6.1`.
 */
export type EstimateInput = {
  sqft: number;
  isAiCampus: boolean;
  /** True only for the handful of hyperscaler-owned, post-2020 builds. */
  isModernHyperscaler: boolean;
  yearBuilt: number;
};

export type EstimateRange = { low: number; high: number };

/** Rounded to the nearest 0.1 MW, matching the Python implementation. */
export function estimateMw(input: EstimateInput): EstimateRange {
  const { sqft, isAiCampus, isModernHyperscaler, yearBuilt } = input;
  let wLow: number;
  let wHigh: number;
  if (isAiCampus) {
    [wLow, wHigh] = [300, 500];
  } else if (isModernHyperscaler && yearBuilt >= 2020) {
    [wLow, wHigh] = [200, 350];
  } else if (yearBuilt >= 2015) {
    [wLow, wHigh] = [150, 250];
  } else {
    [wLow, wHigh] = [100, 200];
  }
  const itSqft = sqft * 0.6;
  return {
    low: Math.round((itSqft * wLow) / 1e5) / 10,
    high: Math.round((itSqft * wHigh) / 1e5) / 10,
  };
}
