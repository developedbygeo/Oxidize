/**
 * Behavioural coverage of every page's run* execution function. Each test
 * mocks the Tauri `invoke` (and `sonner` indirectly via process-toast) to
 * verify:
 *   - the right backend command name is called
 *   - history wiring fires with the right `type` on success
 *   - early-return when there's no input
 *   - failure path still calls onFinish (so the UI exits the processing state)
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CompressionResult,
  ConversionResult,
  BeautifyResult,
  CropResult,
  EffectResult,
  ImageInfo,
  OperationHistoryItem,
  ResizeResult,
  RotateResult,
} from '@/types/image';
import type { VideoInfo, VideoResult } from '@/types/video';

const invoke = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}));

const sonnerToast = {
  loading: vi.fn(() => 'toast-id'),
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
};

vi.mock('sonner', () => ({
  toast: sonnerToast,
}));

const { runConversion } = await import('./convert/_components/useConvertExecution');
const { runCompression } = await import('./compress/_components/useCompressExecution');
const { runBeautify } = await import('./beautify/_components/useBeautifyExecution');
const { runEffects } = await import('./effects/_components/useEffectsExecution');
const { runCrop } = await import('./crop/_components/useCropExecution');
const { runRotate } = await import('./rotate/_components/useRotateExecution');
const { runResize } = await import('./resize/_components/useResizeExecution');
const { runVideoConvert } = await import('./video-convert/_components/useVideoConvertExecution');
const { runVideoCompress } = await import('./video-compress/_components/useVideoCompressExecution');
const { runVideoResize } = await import('./video-resize/_components/useVideoResizeExecution');
const { runVideoTrim } = await import('./video-trim/_components/useVideoTrimExecution');
const { runExtractAudio } = await import('./extract-audio/_components/useExtractAudioExecution');

const image = (overrides: Partial<ImageInfo> = {}): ImageInfo => ({
  path: '/in/photo.png',
  name: 'photo.png',
  size: 1000,
  width: 1000,
  height: 800,
  format: 'png',
  thumbnail: '',
  ...overrides,
});

const video = (overrides: Partial<VideoInfo> = {}): VideoInfo => ({
  path: '/in/clip.mp4',
  name: 'clip.mp4',
  size: 10_000,
  width: 1920,
  height: 1080,
  duration_seconds: 10,
  format: 'mp4',
  video_codec: 'h264',
  audio_codec: 'aac',
  bitrate: 5_000_000,
  thumbnail: null,
  ...overrides,
});

const baseResult = <T extends object>(extra: T): T & { success: boolean; output_path: string } => ({
  ...extra,
  success: true,
  output_path: '/out/photo.png',
});

const noopCallbacks = () => ({
  onStart: vi.fn(),
  onFinish: vi.fn(),
  onOperationComplete: vi.fn(),
});

beforeEach(() => {
  invoke.mockReset();
  sonnerToast.loading.mockClear();
  sonnerToast.success.mockClear();
  sonnerToast.warning.mockClear();
  sonnerToast.error.mockClear();
});

// ──────────────────────────── runConversion ────────────────────────────

describe('runConversion', () => {
  it('returns early on empty input', async () => {
    const cb = noopCallbacks();
    await runConversion({
      images: [],
      values: {
        targetFormat: 'webp',
        quality: 80,
        outputDir: null,
        filenameTemplate: '',
        overwriteMode: 'auto-number',
      },
      ...cb,
    });
    expect(cb.onStart).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('invokes convert_images_batch and reports history on success', async () => {
    const result: ConversionResult = baseResult({
      original_size: 1000,
      new_size: 800,
      error: null,
    });
    invoke.mockResolvedValue([result]);

    const cb = noopCallbacks();
    await runConversion({
      images: [image()],
      values: {
        targetFormat: 'webp',
        quality: 80,
        outputDir: '/out',
        filenameTemplate: '',
        overwriteMode: 'auto-number',
      },
      ...cb,
    });

    expect(invoke).toHaveBeenCalledWith('convert_images_batch', {
      inputPaths: ['/in/photo.png'],
      options: { format: 'webp', quality: 80, output_dir: '/out', naming: null },
    });
    expect(cb.onFinish).toHaveBeenCalledWith([result]);
    expect(cb.onOperationComplete).toHaveBeenCalledWith(
      expect.objectContaining<Omit<OperationHistoryItem, 'id' | 'timestamp'>>({
        type: 'convert',
        fileCount: 1,
        outputDir: '/out',
        details: 'Converted to WebP',
        totalSaved: 200,
      })
    );
  });

  it('calls onFinish with [] when invoke rejects', async () => {
    invoke.mockRejectedValue(new Error('boom'));
    const cb = noopCallbacks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await runConversion({
      images: [image()],
      values: {
        targetFormat: 'webp',
        quality: 80,
        outputDir: null,
        filenameTemplate: '',
        overwriteMode: 'auto-number',
      },
      ...cb,
    });
    expect(cb.onFinish).toHaveBeenCalledWith([]);
    expect(cb.onOperationComplete).not.toHaveBeenCalled();
  });
});

// ──────────────────────────── runCompression ────────────────────────────

describe('runCompression', () => {
  it('invokes compress_images_batch with the resolved quality', async () => {
    const result: CompressionResult = {
      ...baseResult({}),
      original_size: 1000,
      new_size: 700,
      savings_percent: 30,
      error: null,
    };
    invoke.mockResolvedValue([result]);

    const cb = noopCallbacks();
    await runCompression({
      images: [image()],
      values: {
        compressionLevel: 'balanced',
        customQuality: 75,
        useCustom: true,
        outputDir: null,
        filenameTemplate: '',
        overwriteMode: 'auto-number',
        preserveMetadata: false,
      },
      ...cb,
    });

    expect(invoke).toHaveBeenCalledWith('compress_images_batch', {
      inputPaths: ['/in/photo.png'],
      options: { quality: 75, output_dir: null, naming: null, preserve_metadata: null },
    });
    expect(cb.onOperationComplete).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'compress' })
    );
  });
});

// ──────────────────────────── runBeautify ────────────────────────────

describe('runBeautify', () => {
  it('invokes beautify_images_batch with snake-case options and reports history', async () => {
    const result: BeautifyResult = {
      ...baseResult({}),
      input_path: '/in/photo.png',
      original_size: 1000,
      new_size: 1100,
      error: null,
    };
    invoke.mockResolvedValue([result]);

    const cb = noopCallbacks();
    await runBeautify({
      images: [image()],
      values: {
        brightness: 5,
        contrast: 0,
        saturation: 10,
        sharpness: 0,
        exposure: 0,
        hue_shift: 0,
        temperature: 0,
        white_balance: 'cloudy',
        outputDir: '/out',
        filenameTemplate: '',
        overwriteMode: 'auto-number',
      },
      ...cb,
    });

    expect(invoke).toHaveBeenCalledWith('beautify_images_batch', {
      inputPaths: ['/in/photo.png'],
      options: expect.objectContaining({
        brightness: 5,
        saturation: 10,
        white_balance: 'cloudy',
        output_dir: '/out',
      }),
    });
    expect(cb.onOperationComplete).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'beautify' })
    );
  });
});

// ──────────────────────────── runEffects ────────────────────────────

describe('runEffects', () => {
  it('invokes apply_image_effects_batch with the effect and intensity', async () => {
    const result: EffectResult = {
      ...baseResult({}),
      input_path: '/in/photo.png',
      original_size: 1000,
      new_size: 950,
      error: null,
    };
    invoke.mockResolvedValue([result]);

    const cb = noopCallbacks();
    await runEffects({
      images: [image()],
      values: {
        selectedEffect: 'sepia',
        intensity: 60,
        outputDir: null,
        filenameTemplate: '',
        overwriteMode: 'auto-number',
      },
      ...cb,
    });

    expect(invoke).toHaveBeenCalledWith('apply_image_effects_batch', {
      inputPaths: ['/in/photo.png'],
      options: { effect: 'sepia', intensity: 60, output_dir: null, naming: null },
    });
    expect(cb.onOperationComplete).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'effects' })
    );
  });
});

// ──────────────────────────── runCrop ────────────────────────────

describe('runCrop', () => {
  it('skips when crop rect has no area', async () => {
    const cb = noopCallbacks();
    await runCrop({
      images: [image()],
      values: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        aspectRatio: 'free',
        outputDir: null,
        filenameTemplate: '',
        overwriteMode: 'auto-number',
      },
      ...cb,
    });
    expect(cb.onStart).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('rounds coords and forwards them to crop_images_batch', async () => {
    const result: CropResult = {
      ...baseResult({}),
      input_path: '/in/photo.png',
      original_size: 1000,
      new_size: 600,
      error: null,
    };
    invoke.mockResolvedValue([result]);

    const cb = noopCallbacks();
    await runCrop({
      images: [image()],
      values: {
        x: 10.6,
        y: 20.4,
        width: 100.7,
        height: 80.3,
        aspectRatio: 'free',
        outputDir: '/out',
        filenameTemplate: '',
        overwriteMode: 'auto-number',
      },
      ...cb,
    });

    expect(invoke).toHaveBeenCalledWith('crop_images_batch', {
      inputPaths: ['/in/photo.png'],
      options: { x: 11, y: 20, width: 101, height: 80, output_dir: '/out', naming: null },
    });
    expect(cb.onOperationComplete).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'crop', details: 'Cropped to 101×80' })
    );
  });
});

// ──────────────────────────── runRotate ────────────────────────────

describe('runRotate', () => {
  it('returns early without invoking when params are a no-op', async () => {
    const cb = noopCallbacks();
    await runRotate({
      images: [image()],
      values: {
        rotationDegrees: 0,
        flipHorizontal: false,
        flipVertical: false,
        outputDir: null,
        filenameTemplate: '',
        overwriteMode: 'auto-number',
      },
      ...cb,
    });
    expect(cb.onStart).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('forwards rotation + flips with snake-case keys to rotate_images_batch', async () => {
    const result: RotateResult = {
      ...baseResult({}),
      input_path: '/in/photo.png',
      original_size: 1000,
      new_size: 1000,
      error: null,
    };
    invoke.mockResolvedValue([result]);

    const cb = noopCallbacks();
    await runRotate({
      images: [image()],
      values: {
        rotationDegrees: 90,
        flipHorizontal: true,
        flipVertical: false,
        outputDir: '/out',
        filenameTemplate: '',
        overwriteMode: 'auto-number',
      },
      ...cb,
    });

    expect(invoke).toHaveBeenCalledWith('rotate_images_batch', {
      inputPaths: ['/in/photo.png'],
      options: {
        rotation_degrees: 90,
        flip_horizontal: true,
        flip_vertical: false,
        output_dir: '/out',
        naming: null,
      },
    });
    expect(cb.onOperationComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'rotate',
        // Summary string mirrors the rotate-then-flip composition order.
        details: 'Rotate 90° · Flip horizontal',
      })
    );
  });

  it('omits the rotation token from history details when only flips are set', async () => {
    invoke.mockResolvedValue([
      { ...baseResult({}), input_path: '/in/photo.png', original_size: 1, new_size: 1, error: null },
    ] as RotateResult[]);
    const cb = noopCallbacks();
    await runRotate({
      images: [image()],
      values: {
        rotationDegrees: 0,
        flipHorizontal: false,
        flipVertical: true,
        outputDir: null,
        filenameTemplate: '',
        overwriteMode: 'auto-number',
      },
      ...cb,
    });
    expect(cb.onOperationComplete).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'rotate', details: 'Flip vertical' })
    );
  });
});

// ──────────────────────────── runResize ────────────────────────────

describe('runResize', () => {
  it('returns early without invoking when both dimensions are null', async () => {
    const cb = noopCallbacks();
    await runResize({
      images: [image()],
      values: {
        width: null,
        height: null,
        fit: 'cover',
        outputDir: null,
        filenameTemplate: '',
        overwriteMode: 'auto-number',
      },
      ...cb,
    });
    expect(cb.onStart).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('forwards both dimensions + fit to resize_images_batch with snake-case keys', async () => {
    const result: ResizeResult = {
      ...baseResult({}),
      input_path: '/in/photo.png',
      original_size: 1000,
      new_size: 800,
      error: null,
    };
    invoke.mockResolvedValue([result]);

    const cb = noopCallbacks();
    await runResize({
      images: [image()],
      values: {
        width: 1080,
        height: 1080,
        fit: 'cover',
        outputDir: '/out',
        filenameTemplate: '',
        overwriteMode: 'auto-number',
      },
      ...cb,
    });

    expect(invoke).toHaveBeenCalledWith('resize_images_batch', {
      inputPaths: ['/in/photo.png'],
      options: {
        width: 1080,
        height: 1080,
        fit: 'cover',
        output_dir: '/out',
        naming: null,
      },
    });
    expect(cb.onOperationComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'resize',
        details: 'Resize to 1080×1080 (cover)',
      })
    );
  });

  it('writes a single-axis history detail when only width is set', async () => {
    invoke.mockResolvedValue([
      { ...baseResult({}), input_path: '/in/photo.png', original_size: 1, new_size: 1, error: null },
    ] as ResizeResult[]);
    const cb = noopCallbacks();
    await runResize({
      images: [image()],
      values: {
        width: 1920,
        height: null,
        fit: 'cover',
        outputDir: null,
        filenameTemplate: '',
        overwriteMode: 'auto-number',
      },
      ...cb,
    });
    expect(cb.onOperationComplete).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'resize', details: 'Resize width to 1920px' })
    );
  });

  it('writes a single-axis history detail when only height is set', async () => {
    invoke.mockResolvedValue([
      { ...baseResult({}), input_path: '/in/photo.png', original_size: 1, new_size: 1, error: null },
    ] as ResizeResult[]);
    const cb = noopCallbacks();
    await runResize({
      images: [image()],
      values: {
        width: null,
        height: 1080,
        fit: 'cover',
        outputDir: null,
        filenameTemplate: '',
        overwriteMode: 'auto-number',
      },
      ...cb,
    });
    expect(cb.onOperationComplete).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'resize', details: 'Resize height to 1080px' })
    );
  });
});

// ──────────────────────────── image batch cancellation ────────────────────────────

describe('image batch cancellation routing', () => {
  it('runConversion fires the cancelled warning when any result has the cancellation sentinel', async () => {
    invoke.mockResolvedValue([
      {
        success: false,
        output_path: null,
        error: 'cancelled',
        original_size: 0,
        new_size: 0,
      } as ConversionResult,
    ]);
    const cb = noopCallbacks();
    await runConversion({
      images: [image()],
      values: {
        targetFormat: 'webp',
        quality: 80,
        outputDir: null,
        filenameTemplate: '',
        overwriteMode: 'auto-number',
      },
      ...cb,
    });
    expect(sonnerToast.warning).toHaveBeenCalledWith(
      'Conversion cancelled',
      expect.objectContaining({ description: expect.stringContaining('cancel') })
    );
    expect(sonnerToast.success).not.toHaveBeenCalled();
    expect(cb.onOperationComplete).not.toHaveBeenCalled();
  });

  it('runConversion still records history for the successes when a partial batch is cancelled', async () => {
    invoke.mockResolvedValue([
      {
        success: true,
        output_path: '/out/a.webp',
        error: null,
        original_size: 1000,
        new_size: 800,
      } as ConversionResult,
      {
        success: false,
        output_path: null,
        error: 'cancelled',
        original_size: 0,
        new_size: 0,
      } as ConversionResult,
    ]);
    const cb = noopCallbacks();
    await runConversion({
      images: [image({ path: '/in/a.png' }), image({ path: '/in/b.png' })],
      values: {
        targetFormat: 'webp',
        quality: 80,
        outputDir: '/out',
        filenameTemplate: '',
        overwriteMode: 'auto-number',
      },
      ...cb,
    });
    expect(sonnerToast.warning).toHaveBeenCalledWith(
      'Conversion cancelled',
      expect.any(Object)
    );
    expect(cb.onOperationComplete).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'convert', fileCount: 1 })
    );
  });

  it('runCompression fires the cancelled warning when any result has the cancellation sentinel', async () => {
    invoke.mockResolvedValue([
      {
        success: false,
        output_path: null,
        error: 'cancelled',
        original_size: 0,
        new_size: 0,
        savings_percent: 0,
      } as CompressionResult,
    ]);
    await runCompression({
      images: [image()],
      values: {
        compressionLevel: 'balanced',
        customQuality: 80,
        useCustom: false,
        outputDir: null,
        filenameTemplate: '',
        overwriteMode: 'auto-number',
        preserveMetadata: false,
      },
      ...noopCallbacks(),
    });
    expect(sonnerToast.warning).toHaveBeenCalledWith(
      'Compression cancelled',
      expect.any(Object)
    );
    expect(sonnerToast.success).not.toHaveBeenCalled();
  });

  it('runBeautify fires the cancelled warning when any result has the cancellation sentinel', async () => {
    invoke.mockResolvedValue([
      {
        success: false,
        input_path: '/in/photo.png',
        output_path: null,
        error: 'cancelled',
        original_size: 0,
        new_size: 0,
      } as BeautifyResult,
    ]);
    await runBeautify({
      images: [image()],
      values: {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        sharpness: 0,
        exposure: 0,
        hue_shift: 0,
        temperature: 0,
        white_balance: 'daylight',
        outputDir: null,
        filenameTemplate: '',
        overwriteMode: 'auto-number',
      },
      ...noopCallbacks(),
    });
    expect(sonnerToast.warning).toHaveBeenCalledWith(
      'Beautification cancelled',
      expect.any(Object)
    );
  });

  it('runEffects fires the cancelled warning when any result has the cancellation sentinel', async () => {
    invoke.mockResolvedValue([
      {
        success: false,
        input_path: '/in/photo.png',
        output_path: null,
        error: 'cancelled',
        original_size: 0,
        new_size: 0,
      } as EffectResult,
    ]);
    await runEffects({
      images: [image()],
      values: {
        selectedEffect: 'sepia',
        intensity: 60,
        outputDir: null,
        filenameTemplate: '',
        overwriteMode: 'auto-number',
      },
      ...noopCallbacks(),
    });
    expect(sonnerToast.warning).toHaveBeenCalledWith(
      expect.stringMatching(/cancelled/i),
      expect.any(Object)
    );
  });

  it('runCrop fires the cancelled warning when any result has the cancellation sentinel', async () => {
    invoke.mockResolvedValue([
      {
        success: false,
        input_path: '/in/photo.png',
        output_path: null,
        error: 'cancelled',
        original_size: 0,
        new_size: 0,
      } as CropResult,
    ]);
    await runCrop({
      images: [image()],
      values: {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        aspectRatio: 'free',
        outputDir: null,
        filenameTemplate: '',
        overwriteMode: 'auto-number',
      },
      ...noopCallbacks(),
    });
    expect(sonnerToast.warning).toHaveBeenCalledWith(
      'Crop cancelled',
      expect.any(Object)
    );
  });
});

// ──────────────────────────── image batch skip-toast routing ────────────────────────────

describe('image batch skip-toast routing', () => {
  it('runConversion routes a full-batch skip to processToast.skipped', async () => {
    invoke.mockResolvedValue([
      {
        success: false,
        output_path: '/out/a.webp',
        error: 'skipped',
        original_size: 0,
        new_size: 0,
      } as ConversionResult,
    ]);
    await runConversion({
      images: [image()],
      values: {
        targetFormat: 'webp',
        quality: 80,
        outputDir: null,
        filenameTemplate: '',
        overwriteMode: 'skip',
      },
      ...noopCallbacks(),
    });
    expect(sonnerToast.warning).toHaveBeenCalledWith(
      expect.stringMatching(/skipped/i),
      expect.any(Object)
    );
    expect(sonnerToast.success).not.toHaveBeenCalled();
  });

  it('runConversion routes a partial skip (no failures) to processToast.skipped', async () => {
    invoke.mockResolvedValue([
      {
        success: true,
        output_path: '/out/a.webp',
        error: null,
        original_size: 1000,
        new_size: 800,
      } as ConversionResult,
      {
        success: false,
        output_path: '/out/b.webp',
        error: 'skipped',
        original_size: 0,
        new_size: 0,
      } as ConversionResult,
    ]);
    const cb = noopCallbacks();
    await runConversion({
      images: [image({ path: '/in/a.png' }), image({ path: '/in/b.png' })],
      values: {
        targetFormat: 'webp',
        quality: 80,
        outputDir: '/out',
        filenameTemplate: '',
        overwriteMode: 'skip',
      },
      ...cb,
    });
    expect(sonnerToast.warning).toHaveBeenCalledWith(
      'Conversion partially complete',
      expect.objectContaining({ description: expect.stringContaining('1 skipped') })
    );
    // Real successes still produce a history record.
    expect(cb.onOperationComplete).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'convert', fileCount: 1 })
    );
  });

  it('runConversion forwards naming options through to invoke', async () => {
    invoke.mockResolvedValue([]);
    await runConversion({
      images: [image()],
      values: {
        targetFormat: 'webp',
        quality: 80,
        outputDir: null,
        filenameTemplate: '{name}-mini',
        overwriteMode: 'overwrite',
      },
      ...noopCallbacks(),
    });
    const call = invoke.mock.calls[0][1] as {
      options: { naming: { filename_template: string; overwrite_mode: string } | null };
    };
    expect(call.options.naming).toEqual({
      filename_template: '{name}-mini',
      overwrite_mode: 'overwrite',
    });
  });

  it('runConversion sends naming=null when both fields are default', async () => {
    invoke.mockResolvedValue([]);
    await runConversion({
      images: [image()],
      values: {
        targetFormat: 'webp',
        quality: 80,
        outputDir: null,
        filenameTemplate: '',
        overwriteMode: 'auto-number',
      },
      ...noopCallbacks(),
    });
    const call = invoke.mock.calls[0][1] as { options: { naming: unknown } };
    expect(call.options.naming).toBeNull();
  });

  it('falls through to processToast.finish when skip + fail coexist', async () => {
    // Mixed batch: 1 succeeded, 1 skipped, 1 failed → the "skipped" toast
    // path is only for clean partials; failures take priority and we route
    // through the regular finish() warning.
    invoke.mockResolvedValue([
      {
        success: true,
        output_path: '/out/a.webp',
        error: null,
        original_size: 1000,
        new_size: 900,
      } as ConversionResult,
      {
        success: false,
        output_path: '/out/b.webp',
        error: 'skipped',
        original_size: 0,
        new_size: 0,
      } as ConversionResult,
      {
        success: false,
        output_path: null,
        error: 'Permission denied',
        original_size: 0,
        new_size: 0,
      } as ConversionResult,
    ]);
    await runConversion({
      images: [
        image({ path: '/in/a.png' }),
        image({ path: '/in/b.png' }),
        image({ path: '/in/c.png' }),
      ],
      values: {
        targetFormat: 'webp',
        quality: 80,
        outputDir: '/out',
        filenameTemplate: '',
        overwriteMode: 'skip',
      },
      ...noopCallbacks(),
    });
    // Should hit the "partially complete" warning, NOT the skipped-only one.
    expect(sonnerToast.warning).toHaveBeenCalledWith(
      'Conversion partially complete',
      expect.objectContaining({ description: expect.stringContaining('failed') })
    );
  });

  it('runCompression, runBeautify, runEffects, runCrop all surface skipped toasts', async () => {
    // Spot-check the other 4 helpers with a single skip apiece. The toast
    // copy comes from the page's doneLabel + the shared `skipped` channel,
    // so we just look for the "skipped" substring in the title.
    invoke.mockResolvedValue([
      {
        success: false,
        output_path: '/out/x.png',
        error: 'skipped',
        original_size: 0,
        new_size: 0,
        savings_percent: 0,
      } as CompressionResult,
    ]);
    await runCompression({
      images: [image()],
      values: {
        compressionLevel: 'balanced',
        customQuality: 80,
        useCustom: false,
        outputDir: null,
        filenameTemplate: '',
        overwriteMode: 'skip',
        preserveMetadata: false,
      },
      ...noopCallbacks(),
    });
    expect(sonnerToast.warning).toHaveBeenCalledWith(
      'Compression skipped',
      expect.any(Object)
    );

    sonnerToast.warning.mockClear();
    invoke.mockResolvedValue([
      {
        success: false,
        input_path: '/in/photo.png',
        output_path: '/out/x.png',
        error: 'skipped',
        original_size: 0,
        new_size: 0,
      } as BeautifyResult,
    ]);
    await runBeautify({
      images: [image()],
      values: {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        sharpness: 0,
        exposure: 0,
        hue_shift: 0,
        temperature: 0,
        white_balance: 'daylight',
        outputDir: null,
        filenameTemplate: '',
        overwriteMode: 'skip',
      },
      ...noopCallbacks(),
    });
    expect(sonnerToast.warning).toHaveBeenCalledWith(
      'Beautification skipped',
      expect.any(Object)
    );

    sonnerToast.warning.mockClear();
    invoke.mockResolvedValue([
      {
        success: false,
        input_path: '/in/photo.png',
        output_path: '/out/x.png',
        error: 'skipped',
        original_size: 0,
        new_size: 0,
      } as EffectResult,
    ]);
    await runEffects({
      images: [image()],
      values: {
        selectedEffect: 'sepia',
        intensity: 60,
        outputDir: null,
        filenameTemplate: '',
        overwriteMode: 'skip',
      },
      ...noopCallbacks(),
    });
    expect(sonnerToast.warning).toHaveBeenCalledWith(
      expect.stringMatching(/skipped/i),
      expect.any(Object)
    );

    sonnerToast.warning.mockClear();
    invoke.mockResolvedValue([
      {
        success: false,
        input_path: '/in/photo.png',
        output_path: '/out/x.png',
        error: 'skipped',
        original_size: 0,
        new_size: 0,
      } as CropResult,
    ]);
    await runCrop({
      images: [image()],
      values: {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        aspectRatio: 'free',
        outputDir: null,
        filenameTemplate: '',
        overwriteMode: 'skip',
      },
      ...noopCallbacks(),
    });
    expect(sonnerToast.warning).toHaveBeenCalledWith(
      'Crop skipped',
      expect.any(Object)
    );
  });
});

// ──────────────────────────── runVideoConvert ────────────────────────────

describe('runVideoConvert cancellation routing', () => {
  it('fires the cancelled warning toast when any result has the cancellation sentinel', async () => {
    invoke.mockResolvedValue([
      {
        success: false,
        input_path: '/in/clip.mp4',
        output_path: null,
        error: 'cancelled',
        original_size: 10_000,
        new_size: 0,
      },
    ]);

    await runVideoConvert({
      videos: [video()],
      values: { targetFormat: 'mp4', mode: 'remux', crf: 23, outputDir: null },
      ...noopCallbacks(),
    });

    expect(sonnerToast.warning).toHaveBeenCalledWith(
      'Conversion cancelled',
      expect.objectContaining({ description: expect.stringContaining('cancel') })
    );
    expect(sonnerToast.success).not.toHaveBeenCalled();
  });

  it('humanises the catch-path error before showing the failure toast', async () => {
    invoke.mockRejectedValue(new Error('Permission denied'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await runVideoConvert({
      videos: [video()],
      values: { targetFormat: 'mp4', mode: 'remux', crf: 23, outputDir: null },
      ...noopCallbacks(),
    });

    expect(sonnerToast.error).toHaveBeenCalledWith(
      expect.stringMatching(/Permission denied/),
      expect.objectContaining({ description: expect.any(String) })
    );
  });

  it('routes to cancelled (not failure) when the catch path sees the cancellation sentinel', async () => {
    invoke.mockRejectedValue('cancelled');
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await runVideoConvert({
      videos: [video()],
      values: { targetFormat: 'mp4', mode: 'remux', crf: 23, outputDir: null },
      ...noopCallbacks(),
    });

    expect(sonnerToast.warning).toHaveBeenCalledWith(
      'Conversion cancelled',
      expect.any(Object)
    );
    expect(sonnerToast.error).not.toHaveBeenCalled();
  });
});

describe('runVideoConvert', () => {
  it('invokes convert_videos_batch with the right command and history type', async () => {
    const result: VideoResult = {
      ...baseResult({}),
      input_path: '/in/clip.mp4',
      original_size: 1000,
      new_size: 800,
      error: null,
    };
    invoke.mockResolvedValue([result]);

    const cb = noopCallbacks();
    await runVideoConvert({
      videos: [video()],
      values: { targetFormat: 'mp4', mode: 'remux', crf: 23, outputDir: null },
      ...cb,
    });

    expect(invoke).toHaveBeenCalledWith('convert_videos_batch', expect.any(Object));
    expect(cb.onOperationComplete).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'video-convert' })
    );
  });
});

// ──────────────────────────── runVideoCompress ────────────────────────────

describe('runVideoCompress', () => {
  it('invokes compress_videos_batch', async () => {
    invoke.mockResolvedValue([]);
    const cb = noopCallbacks();
    await runVideoCompress({
      videos: [video()],
      values: {
        targetFormat: 'mp4',
        mode: 'crf',
        crf: 23,
        bitrateKbps: 2000,
        preset: 'medium',
        outputDir: null,
      },
      ...cb,
    });
    expect(invoke).toHaveBeenCalledWith('compress_videos_batch', expect.any(Object));
    expect(cb.onFinish).toHaveBeenCalledWith([]);
  });
});

// ──────────────────────────── runVideoResize ────────────────────────────

describe('runVideoResize', () => {
  it('invokes resize_videos_batch', async () => {
    invoke.mockResolvedValue([]);
    const cb = noopCallbacks();
    await runVideoResize({
      videos: [video()],
      values: {
        targetFormat: 'mp4',
        mode: 'presetheight',
        presetHeight: 720,
        customWidth: 1280,
        customHeight: 720,
        maintainAspect: true,
        crf: 23,
        outputDir: null,
      },
      ...cb,
    });
    expect(invoke).toHaveBeenCalledWith('resize_videos_batch', expect.any(Object));
  });
});

// ──────────────────────────── runVideoTrim ────────────────────────────

describe('runVideoTrim', () => {
  it('records a failure when trim end <= start without calling trim_video', async () => {
    const cb = noopCallbacks();
    await runVideoTrim({
      videos: [video()],
      trims: { '/in/clip.mp4': { start: 5, end: 5 } },
      values: { mode: 'fast', crf: 23, outputDir: null },
      ...cb,
    });
    expect(invoke).not.toHaveBeenCalled();
    expect(cb.onFinish).toHaveBeenCalledWith([
      expect.objectContaining({ success: false, error: 'Invalid trim range' }),
    ]);
  });

  it('invokes trim_video once per video and reports history', async () => {
    const result: VideoResult = {
      ...baseResult({ output_path: '/out/clip.mp4' }),
      input_path: '/in/clip.mp4',
      original_size: 10_000,
      new_size: 5_000,
      error: null,
    };
    invoke.mockResolvedValue(result);

    const cb = noopCallbacks();
    await runVideoTrim({
      videos: [video()],
      trims: { '/in/clip.mp4': { start: 1, end: 5 } },
      values: { mode: 'accurate', crf: 23, outputDir: '/out' },
      ...cb,
    });

    expect(invoke).toHaveBeenCalledWith('trim_video', {
      inputPath: '/in/clip.mp4',
      options: expect.objectContaining({
        mode: 'accurate',
        start_seconds: 1,
        end_seconds: 5,
        crf: 23,
      }),
    });
    expect(cb.onOperationComplete).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'video-trim' })
    );
  });

  it('forces crf to null in fast (stream-copy) mode', async () => {
    invoke.mockResolvedValue({
      success: true,
      input_path: '/in/clip.mp4',
      output_path: '/out/clip.mp4',
      error: null,
      original_size: 10_000,
      new_size: 8_000,
    });

    await runVideoTrim({
      videos: [video()],
      trims: { '/in/clip.mp4': { start: 1, end: 5 } },
      values: { mode: 'fast', crf: 30, outputDir: null },
      ...noopCallbacks(),
    });

    expect(invoke).toHaveBeenCalledWith('trim_video', {
      inputPath: '/in/clip.mp4',
      options: expect.objectContaining({ mode: 'fast', crf: null }),
    });
  });
});

// ──────────────────────────── runExtractAudio ────────────────────────────

describe('runExtractAudio', () => {
  it('invokes extract_audio_batch with format and bitrate', async () => {
    invoke.mockResolvedValue([]);
    const cb = noopCallbacks();
    await runExtractAudio({
      videos: [video()],
      values: { targetFormat: 'mp3', bitrateKbps: 192, outputDir: null },
      ...cb,
    });
    expect(invoke).toHaveBeenCalledWith('extract_audio_batch', expect.any(Object));
    const call = invoke.mock.calls[0][1] as { options: { format: string; bitrate_kbps: number } };
    expect(call.options.format).toBe('mp3');
    expect(call.options.bitrate_kbps).toBe(192);
  });
});
