import { describe, it, expect } from 'vitest';
import { estimateMw } from './estimate-mw';

describe('estimateMw', () => {
  it('uses AI-campus band (300-500 W/sqft) when flagged', () => {
    // 1,000,000 sqft × 0.6 IT × 300–500 W = 180–300 MW
    const r = estimateMw({ sqft: 1_000_000, isAiCampus: true, isModernHyperscaler: true, yearBuilt: 2025 });
    expect(r).toEqual({ low: 180, high: 300 });
  });

  it('uses modern-hyperscaler band (200-350 W/sqft) for post-2020 builds', () => {
    // 500,000 × 0.6 × 200–350 = 60–105 MW
    const r = estimateMw({ sqft: 500_000, isAiCampus: false, isModernHyperscaler: true, yearBuilt: 2022 });
    expect(r).toEqual({ low: 60, high: 105 });
  });

  it('uses 2015-2019 band (150-250 W/sqft)', () => {
    const r = estimateMw({ sqft: 500_000, isAiCampus: false, isModernHyperscaler: false, yearBuilt: 2018 });
    expect(r).toEqual({ low: 45, high: 75 });
  });

  it('uses legacy band (100-200 W/sqft) for pre-2015', () => {
    const r = estimateMw({ sqft: 500_000, isAiCampus: false, isModernHyperscaler: false, yearBuilt: 2010 });
    expect(r).toEqual({ low: 30, high: 60 });
  });

  it('AI-campus flag overrides hyperscaler + year gates', () => {
    const r = estimateMw({ sqft: 100_000, isAiCampus: true, isModernHyperscaler: false, yearBuilt: 2000 });
    // 100k × 0.6 × 300–500 = 18–30 MW
    expect(r).toEqual({ low: 18, high: 30 });
  });
});
