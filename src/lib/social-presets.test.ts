import { describe, expect, it } from 'vitest';
import {
  PLATFORM_LABELS,
  PLATFORM_ORDER,
  SOCIAL_PRESETS,
  presetById,
  presetsForPlatform,
} from './social-presets';

describe('SOCIAL_PRESETS catalog invariants', () => {
  it('every preset has a unique id', () => {
    const ids = SOCIAL_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every image preset declares imageFormat AND imageQuality (and no video fields)', () => {
    const imagePresets = SOCIAL_PRESETS.filter((p) => p.mediaType === 'image');
    expect(imagePresets.length).toBeGreaterThan(0);
    for (const p of imagePresets) {
      expect(p.imageFormat, `${p.id} is missing imageFormat`).toBeDefined();
      expect(p.imageQuality, `${p.id} is missing imageQuality`).toBeDefined();
      expect(p.videoFormat, `${p.id} should not declare videoFormat`).toBeUndefined();
      expect(p.videoCrf, `${p.id} should not declare videoCrf`).toBeUndefined();
    }
  });

  it('every video preset declares videoFormat AND videoCrf (and no image fields)', () => {
    const videoPresets = SOCIAL_PRESETS.filter((p) => p.mediaType === 'video');
    expect(videoPresets.length).toBeGreaterThan(0);
    for (const p of videoPresets) {
      expect(p.videoFormat, `${p.id} is missing videoFormat`).toBeDefined();
      expect(p.videoCrf, `${p.id} is missing videoCrf`).toBeDefined();
      expect(p.imageFormat, `${p.id} should not declare imageFormat`).toBeUndefined();
      expect(p.imageQuality, `${p.id} should not declare imageQuality`).toBeUndefined();
    }
  });

  it('every preset has positive dimensions within sane bounds', () => {
    for (const p of SOCIAL_PRESETS) {
      expect(p.width, `${p.id} width`).toBeGreaterThan(0);
      expect(p.height, `${p.id} height`).toBeGreaterThan(0);
      // 16k cap matches the resize schema's MAX_DIMENSION.
      expect(p.width, `${p.id} width below 16k cap`).toBeLessThanOrEqual(16_384);
      expect(p.height, `${p.id} height below 16k cap`).toBeLessThanOrEqual(16_384);
    }
  });

  it('every image preset has a quality in 1..100', () => {
    for (const p of SOCIAL_PRESETS.filter((p) => p.mediaType === 'image')) {
      expect(p.imageQuality!).toBeGreaterThanOrEqual(1);
      expect(p.imageQuality!).toBeLessThanOrEqual(100);
    }
  });

  it('every video preset has a CRF in 0..51 (x264 range)', () => {
    for (const p of SOCIAL_PRESETS.filter((p) => p.mediaType === 'video')) {
      expect(p.videoCrf!).toBeGreaterThanOrEqual(0);
      expect(p.videoCrf!).toBeLessThanOrEqual(51);
    }
  });

  it('every platform in PLATFORM_ORDER appears in PLATFORM_LABELS and has at least one preset', () => {
    for (const p of PLATFORM_ORDER) {
      expect(PLATFORM_LABELS[p], `${p} missing label`).toBeDefined();
      expect(presetsForPlatform(p).length, `${p} has no presets`).toBeGreaterThan(0);
    }
  });

  it('every preset platform is in PLATFORM_ORDER (no orphans)', () => {
    for (const p of SOCIAL_PRESETS) {
      expect(PLATFORM_ORDER, `${p.id} references unknown platform ${p.platform}`).toContain(
        p.platform
      );
    }
  });
});

describe('presetById', () => {
  it('returns the matching preset when the id exists', () => {
    expect(presetById('instagram-square')?.platform).toBe('instagram');
  });

  it('returns undefined for an unknown id', () => {
    expect(presetById('nope')).toBeUndefined();
  });
});

describe('presetsForPlatform', () => {
  it('returns only presets for the requested platform', () => {
    const got = presetsForPlatform('youtube');
    expect(got.length).toBeGreaterThan(0);
    for (const p of got) expect(p.platform).toBe('youtube');
  });
});
