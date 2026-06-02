import { describe, expect, it } from 'vitest';
import { toOutputNaming, DEFAULT_OVERWRITE_MODE } from './output-naming';

describe('toOutputNaming', () => {
  it('returns null when neither template nor non-default mode is set', () => {
    expect(toOutputNaming('', 'auto-number')).toBeNull();
    expect(toOutputNaming(null, null)).toBeNull();
    expect(toOutputNaming(undefined, undefined)).toBeNull();
    expect(toOutputNaming('   ', DEFAULT_OVERWRITE_MODE)).toBeNull();
  });

  it('emits the trimmed template when a non-empty one is provided', () => {
    expect(toOutputNaming('  {name}-mini ', 'auto-number')).toEqual({
      filename_template: '{name}-mini',
      overwrite_mode: null,
    });
  });

  it('emits the overwrite mode when set to a non-default value', () => {
    expect(toOutputNaming(null, 'skip')).toEqual({
      filename_template: null,
      overwrite_mode: 'skip',
    });
    expect(toOutputNaming(null, 'overwrite')).toEqual({
      filename_template: null,
      overwrite_mode: 'overwrite',
    });
  });

  it('omits the overwrite mode when it equals the default', () => {
    // Sending the historical default round-trips to null so the Rust side
    // doesn't have to encode a redundant value.
    expect(toOutputNaming('{name}_x', 'auto-number')).toEqual({
      filename_template: '{name}_x',
      overwrite_mode: null,
    });
  });

  it('emits both fields when both are non-default', () => {
    expect(toOutputNaming('{name}-{date}', 'skip')).toEqual({
      filename_template: '{name}-{date}',
      overwrite_mode: 'skip',
    });
  });
});
