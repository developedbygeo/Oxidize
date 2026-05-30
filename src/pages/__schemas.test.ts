/**
 * Snapshot of every page's form-schema contract. Each test verifies:
 *   - the exported `defaultFormValues` actually parse against the schema (catches
 *     regressions when someone edits the defaults but forgets the schema)
 *   - one representative invalid input is rejected.
 */
import { describe, expect, it } from 'vitest';

import {
  convertFormSchema,
  defaultFormValues as convertDefaults,
} from './convert/_components/schema';
import {
  compressFormSchema,
  defaultFormValues as compressDefaults,
} from './compress/_components/schema';
import {
  beautifyFormSchema,
  defaultFormValues as beautifyDefaults,
} from './beautify/_components/schema';
import {
  effectsFormSchema,
  defaultFormValues as effectsDefaults,
} from './effects/_components/schema';
import {
  cropFormSchema,
  defaultFormValues as cropDefaults,
} from './crop/_components/schema';
import {
  rotateFormSchema,
  defaultFormValues as rotateDefaults,
} from './rotate/_components/schema';
import {
  resizeFormSchema,
  defaultFormValues as resizeDefaults,
} from './resize/_components/schema';
import {
  pipelineSchema,
  defaultValues as pipelineDefaults,
} from './pipeline/_components/schema';
import {
  videoConvertFormSchema,
  defaultFormValues as videoConvertDefaults,
} from './video-convert/_components/schema';
import {
  videoCompressFormSchema,
  defaultFormValues as videoCompressDefaults,
} from './video-compress/_components/schema';
import {
  videoResizeFormSchema,
  defaultFormValues as videoResizeDefaults,
} from './video-resize/_components/schema';
import {
  videoTrimFormSchema,
  defaultFormValues as videoTrimDefaults,
} from './video-trim/_components/schema';
import {
  extractAudioFormSchema,
  defaultFormValues as extractAudioDefaults,
} from './extract-audio/_components/schema';

describe('schema defaults parse cleanly', () => {
  it.each([
    ['convert', convertFormSchema, convertDefaults],
    ['compress', compressFormSchema, compressDefaults],
    ['beautify', beautifyFormSchema, beautifyDefaults],
    ['effects', effectsFormSchema, effectsDefaults],
    ['crop', cropFormSchema, cropDefaults],
    ['rotate', rotateFormSchema, rotateDefaults],
    ['resize', resizeFormSchema, resizeDefaults],
    ['pipeline', pipelineSchema, pipelineDefaults],
    ['video-convert', videoConvertFormSchema, videoConvertDefaults],
    ['video-compress', videoCompressFormSchema, videoCompressDefaults],
    ['video-resize', videoResizeFormSchema, videoResizeDefaults],
    ['video-trim', videoTrimFormSchema, videoTrimDefaults],
    ['extract-audio', extractAudioFormSchema, extractAudioDefaults],
  ])('%s', (_name, schema, defaults) => {
    expect(schema.safeParse(defaults).success).toBe(true);
  });
});

describe('schemas reject representative invalid input', () => {
  it('convert: rejects an unknown format', () => {
    expect(convertFormSchema.safeParse({ ...convertDefaults, targetFormat: 'heic' }).success).toBe(
      false
    );
  });

  it('convert: rejects out-of-range quality', () => {
    expect(convertFormSchema.safeParse({ ...convertDefaults, quality: 200 }).success).toBe(false);
  });

  it('compress: rejects below-min quality', () => {
    expect(
      compressFormSchema.safeParse({ ...compressDefaults, customQuality: 5 }).success
    ).toBe(false);
  });

  it('beautify: rejects brightness > 100', () => {
    expect(beautifyFormSchema.safeParse({ ...beautifyDefaults, brightness: 150 }).success).toBe(
      false
    );
  });

  it('beautify: rejects an unknown white_balance preset', () => {
    expect(
      beautifyFormSchema.safeParse({ ...beautifyDefaults, white_balance: 'neon' }).success
    ).toBe(false);
  });

  it('effects: rejects an unknown effect type', () => {
    expect(
      effectsFormSchema.safeParse({ ...effectsDefaults, selectedEffect: 'glitch' }).success
    ).toBe(false);
  });

  it('crop: rejects negative coords', () => {
    expect(cropFormSchema.safeParse({ ...cropDefaults, x: -1 }).success).toBe(false);
  });

  it('rotate: rejects an arbitrary angle (only quarter-turns allowed)', () => {
    // 45° is the canonical "not a quarter turn" — schema is z.union of literals.
    expect(
      rotateFormSchema.safeParse({ ...rotateDefaults, rotationDegrees: 45 }).success
    ).toBe(false);
  });

  it('resize: rejects when both dimensions are null', () => {
    // The refine() guards against no-op submissions before they hit the
    // backend — at least one of width/height must be set.
    expect(
      resizeFormSchema.safeParse({ ...resizeDefaults, width: null, height: null }).success
    ).toBe(false);
  });

  it('resize: rejects an absurd dimension above the 16k cap', () => {
    expect(
      resizeFormSchema.safeParse({ ...resizeDefaults, width: 99_999 }).success
    ).toBe(false);
  });

  it('resize: accepts a single-axis request (height auto-derives)', () => {
    expect(
      resizeFormSchema.safeParse({ ...resizeDefaults, width: 1080, height: null }).success
    ).toBe(true);
  });

  it('pipeline: rejects below-min compressQuality', () => {
    expect(pipelineSchema.safeParse({ ...pipelineDefaults, compressQuality: 5 }).success).toBe(
      false
    );
  });

  it('video-convert: rejects an unknown target format', () => {
    expect(
      videoConvertFormSchema.safeParse({ ...videoConvertDefaults, targetFormat: 'flv' }).success
    ).toBe(false);
  });

  it('video-trim: rejects crf > 51', () => {
    expect(videoTrimFormSchema.safeParse({ ...videoTrimDefaults, crf: 60 }).success).toBe(false);
  });

  it('extract-audio: rejects an unknown format', () => {
    expect(
      extractAudioFormSchema.safeParse({ ...extractAudioDefaults, targetFormat: 'ogg' }).success
    ).toBe(false);
  });
});
