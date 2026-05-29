import { describe, expect, it } from 'vitest';
import { getDirectory, resolveOutputDir, formatAdjustmentDetails } from './utils';

describe('getDirectory', () => {
  it('returns the parent directory for a POSIX path', () => {
    expect(getDirectory('/Users/me/Pictures/photo.png')).toBe('/Users/me/Pictures');
  });

  it('returns the parent directory for a Windows path', () => {
    expect(getDirectory('C:\\Users\\me\\Pictures\\photo.png')).toBe('C:\\Users\\me\\Pictures');
  });

  it('handles mixed separators by using the last one', () => {
    expect(getDirectory('C:\\Users/me\\Pictures/photo.png')).toBe('C:\\Users/me\\Pictures');
  });

  it('returns the input untouched when no separator is present', () => {
    expect(getDirectory('photo.png')).toBe('photo.png');
  });

  it('returns the input untouched when the only separator is at index 0', () => {
    // Path like `/photo.png` — slicing at 0 would return '', so we deliberately
    // require the separator to be after index 0 before slicing.
    expect(getDirectory('/photo.png')).toBe('/photo.png');
  });
});

describe('resolveOutputDir', () => {
  it('returns the directory of the first successful result', () => {
    const dir = resolveOutputDir({
      results: [
        { output_path: null },
        { output_path: '/out/cropped/photo.png' },
        { output_path: '/out/cropped/photo2.png' },
      ],
      fallbackDir: '/should/not/be/used',
    });
    expect(dir).toBe('/out/cropped');
  });

  it('falls back to fallbackDir when no results have an output_path', () => {
    const dir = resolveOutputDir({
      results: [{ output_path: null }, { output_path: null }],
      fallbackDir: '/chosen/output',
    });
    expect(dir).toBe('/chosen/output');
  });

  it('falls back to fallbackPath dir when fallbackDir is null', () => {
    const dir = resolveOutputDir({
      results: [],
      fallbackDir: null,
      fallbackPath: '/Users/me/input/photo.png',
    });
    expect(dir).toBe('/Users/me/input');
  });

  it('returns empty string when no fallback is available', () => {
    expect(resolveOutputDir({ results: [], fallbackDir: null })).toBe('');
  });
});

describe('formatAdjustmentDetails', () => {
  it('returns the fallback when no adjustments differ from defaults', () => {
    expect(
      formatAdjustmentDetails([
        { label: 'Brightness', value: 0 },
        { label: 'Contrast', value: 0 },
      ])
    ).toBe('No adjustments');
  });

  it('formats positive numbers with explicit + sign by default', () => {
    expect(
      formatAdjustmentDetails([
        { label: 'Brightness', value: 25 },
        { label: 'Contrast', value: -10 },
      ])
    ).toBe('Brightness +25, Contrast -10');
  });

  it('handles string values (e.g. white-balance presets)', () => {
    expect(
      formatAdjustmentDetails([
        { label: 'WB', value: 'cloudy', defaultValue: 'daylight' },
      ])
    ).toBe('WB: cloudy');
  });

  it('respects a custom defaultValue when filtering', () => {
    expect(
      formatAdjustmentDetails([
        { label: 'WB', value: 'daylight', defaultValue: 'daylight' },
      ])
    ).toBe('No adjustments');
  });

  it('truncates to maxItems and drops the rest silently', () => {
    expect(
      formatAdjustmentDetails(
        [
          { label: 'A', value: 1 },
          { label: 'B', value: 2 },
          { label: 'C', value: 3 },
          { label: 'D', value: 4 },
        ],
        2
      )
    ).toBe('A +1, B +2');
  });

  it('honors showSign=false and suffix', () => {
    expect(
      formatAdjustmentDetails([
        { label: 'Quality', value: 80, showSign: false, suffix: '%' },
      ])
    ).toBe('Quality 80%');
  });

  it('uses a custom fallback string', () => {
    expect(
      formatAdjustmentDetails([{ label: 'Brightness', value: 0 }], 3, 'Default settings')
    ).toBe('Default settings');
  });
});
