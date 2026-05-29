import { describe, expect, it } from 'vitest';
import { crfToQuality, qualityToCrf } from './video-quality';

describe('crfToQuality', () => {
  it('maps CRF 0 (lossless) to 100% quality', () => {
    expect(crfToQuality(0)).toBe(100);
  });

  it('maps CRF 51 (worst) to 0% quality', () => {
    expect(crfToQuality(51)).toBe(0);
  });

  it('maps the midpoint roughly to 50%', () => {
    // 51/2 = 25.5 → roughly half-quality
    expect(crfToQuality(26)).toBeCloseTo(49, 0);
  });
});

describe('qualityToCrf', () => {
  it('maps 100% to CRF 0', () => {
    expect(qualityToCrf(100)).toBe(0);
  });

  it('maps 0% to CRF 51', () => {
    expect(qualityToCrf(0)).toBe(51);
  });

  it('maps 50% near the CRF midpoint', () => {
    expect(qualityToCrf(50)).toBeCloseTo(26, 0);
  });
});

describe('crfToQuality ↔ qualityToCrf round-trip', () => {
  it('round-trips integer percentages within ±1 (rounding tolerance)', () => {
    for (let q = 0; q <= 100; q += 5) {
      const crf = qualityToCrf(q);
      const back = crfToQuality(crf);
      expect(Math.abs(back - q)).toBeLessThanOrEqual(1);
    }
  });
});
