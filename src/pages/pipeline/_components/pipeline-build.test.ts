import { describe, expect, it } from 'vitest';
import { defaultValues, type PipelineFormValues } from './schema';
import { buildDetails, buildOptions, hasPipelineWork } from './pipeline-build';

const values = (overrides: Partial<PipelineFormValues> = {}): PipelineFormValues => ({
  ...defaultValues,
  ...overrides,
});

describe('buildOptions', () => {
  it('returns nulls when nothing is enabled', () => {
    const options = buildOptions(values({ compressEnabled: false }));
    expect(options).toEqual({
      crop: null,
      beautify: null,
      effects: null,
      convert: null,
      compress: null,
      output_dir: null,
      naming: null,
    });
  });

  it('packages enabled beautify fields with snake-case keys for the backend', () => {
    const options = buildOptions(
      values({
        beautifyEnabled: true,
        brightness: 10,
        hueShift: 45,
        whiteBalance: 'cloudy',
      })
    );
    expect(options.beautify).toEqual({
      brightness: 10,
      contrast: 0,
      saturation: 0,
      sharpness: 0,
      exposure: 0,
      hue_shift: 45,
      temperature: 0,
      white_balance: 'cloudy',
    });
  });

  it('omits crop when enabled but the rect has zero area', () => {
    const options = buildOptions(
      values({ cropEnabled: true, cropX: 0, cropY: 0, cropWidth: 0, cropHeight: 0 })
    );
    expect(options.crop).toBeNull();
  });

  it('includes crop when enabled with a positive rect', () => {
    const options = buildOptions(
      values({ cropEnabled: true, cropX: 10, cropY: 20, cropWidth: 100, cropHeight: 80 })
    );
    expect(options.crop).toEqual({ x: 10, y: 20, width: 100, height: 80 });
  });

  it('forwards effect type and intensity', () => {
    const options = buildOptions(
      values({ effectsEnabled: true, effectType: 'sepia', effectIntensity: 70 })
    );
    expect(options.effects).toEqual({ effect: 'sepia', intensity: 70 });
  });
});

describe('buildDetails', () => {
  it('returns an empty list when nothing is enabled', () => {
    expect(buildDetails(values({ compressEnabled: false }))).toEqual([]);
  });

  it('orders the details: crop, beautify, effects, convert, compress', () => {
    const list = buildDetails(
      values({
        cropEnabled: true,
        cropWidth: 100,
        cropHeight: 80,
        beautifyEnabled: true,
        effectsEnabled: true,
        effectType: 'vintage',
        convertEnabled: true,
        convertFormat: 'webp',
        convertQuality: 90,
        compressEnabled: true,
        compressQuality: 80,
      })
    );
    expect(list).toEqual([
      'Crop 100×80',
      'Beautify',
      'Effect: Vintage',
      'Convert to WebP',
      'Compress @80%',
    ]);
  });

  it('falls back to the raw effect type when label is unknown', () => {
    const list = buildDetails(
      values({ effectsEnabled: true, effectType: 'grayscale' as never })
    );
    expect(list[0]).toBe('Effect: Grayscale');
  });

  it('skips crop when rect has no area', () => {
    expect(
      buildDetails(values({ cropEnabled: true, cropWidth: 0, cropHeight: 0 }))
    ).not.toContain('Crop 0×0');
  });
});

describe('hasPipelineWork', () => {
  it('returns false when no operation is enabled', () => {
    expect(hasPipelineWork(values({ compressEnabled: false }))).toBe(false);
  });

  it('returns true when only crop is enabled with a non-zero rect (regression)', () => {
    // Before this fix, the execute() opCount calculation ignored cropEnabled,
    // so enabling only crop produced a no-op pipeline. Lock it in.
    expect(
      hasPipelineWork(
        values({
          cropEnabled: true,
          cropWidth: 100,
          cropHeight: 80,
          compressEnabled: false,
        })
      )
    ).toBe(true);
  });

  it('returns false when crop is enabled but rect has zero area', () => {
    expect(
      hasPipelineWork(
        values({ cropEnabled: true, cropWidth: 0, cropHeight: 0, compressEnabled: false })
      )
    ).toBe(false);
  });

  it('returns true when any other op is enabled', () => {
    expect(hasPipelineWork(values({ beautifyEnabled: true, compressEnabled: false }))).toBe(true);
    expect(hasPipelineWork(values({ effectsEnabled: true, compressEnabled: false }))).toBe(true);
    expect(hasPipelineWork(values({ convertEnabled: true, compressEnabled: false }))).toBe(true);
    expect(hasPipelineWork(values({ compressEnabled: true }))).toBe(true);
  });
});
