/**
 * `runSocialPreset` is the only routing logic between the catalog and the
 * existing batch commands — so it gets its own focused test rather than
 * folding into `__executions.test.ts`. Key assertions:
 *   - image presets call resize_images_batch with Cover fit + the preset dims
 *   - video presets call resize_videos_batch with maintain_aspect=false
 *   - empty file list of the relevant type short-circuits before invoke
 *   - the executor passes naming + output_dir through correctly
 *   - history items declare type='social' regardless of media type
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImageInfo, OperationHistoryItem } from '@/types/image';
import type { VideoInfo } from '@/types/video';
import type { SocialPreset } from '@/lib/social-presets';

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
vi.mock('sonner', () => ({ toast: sonnerToast }));

const { runSocialPreset } = await import('./_components/useSocialExecution');

const image = (path = '/in/photo.png'): ImageInfo => ({
  path,
  name: path.split(/[/\\]/).pop()!,
  size: 1000,
  width: 1000,
  height: 1000,
  format: 'png',
  thumbnail: '',
});

const video = (path = '/in/clip.mp4'): VideoInfo => ({
  path,
  name: path.split(/[/\\]/).pop()!,
  size: 10_000,
  width: 1920,
  height: 1080,
  duration_seconds: 10,
  format: 'mp4',
  video_codec: 'h264',
  audio_codec: 'aac',
  bitrate: 5_000_000,
  thumbnail: null,
});

const imagePreset: SocialPreset = {
  id: 'test-image',
  platform: 'instagram',
  mediaType: 'image',
  name: 'Test square',
  description: '1080×1080',
  width: 1080,
  height: 1080,
  imageFormat: 'jpg',
  imageQuality: 85,
};

const videoPreset: SocialPreset = {
  id: 'test-video',
  platform: 'tiktok',
  mediaType: 'video',
  name: 'Test vertical',
  description: '1080×1920',
  width: 1080,
  height: 1920,
  videoFormat: 'mp4',
  videoCrf: 23,
};

const fields = {
  outputDir: null,
  filenameTemplate: '',
  overwriteMode: 'auto-number' as const,
};

const noopCallbacks = () => ({
  onStart: vi.fn(),
  onFinish: vi.fn(),
  onOperationComplete: vi.fn<(item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void>(),
});

beforeEach(() => {
  invoke.mockReset();
  sonnerToast.loading.mockClear();
  sonnerToast.success.mockClear();
  sonnerToast.warning.mockClear();
  sonnerToast.error.mockClear();
});

describe('runSocialPreset', () => {
  it('image preset: short-circuits when no images are provided', async () => {
    const cb = noopCallbacks();
    await runSocialPreset({
      preset: imagePreset,
      images: [],
      videos: [],
      fields,
      ...cb,
    });
    expect(cb.onStart).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('video preset: short-circuits when no videos are provided (even if images exist)', async () => {
    const cb = noopCallbacks();
    await runSocialPreset({
      preset: videoPreset,
      images: [image()],
      videos: [],
      fields,
      ...cb,
    });
    expect(cb.onStart).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('image preset routes through resize_images_batch with Cover fit + preset dims', async () => {
    invoke.mockResolvedValue([
      {
        success: true,
        input_path: '/in/photo.png',
        output_path: '/out/photo.jpg',
        error: null,
        original_size: 1000,
        new_size: 800,
      },
    ]);
    const cb = noopCallbacks();
    await runSocialPreset({
      preset: imagePreset,
      images: [image()],
      videos: [],
      fields,
      ...cb,
    });

    expect(invoke).toHaveBeenCalledWith('resize_images_batch', {
      inputPaths: ['/in/photo.png'],
      options: {
        width: 1080,
        height: 1080,
        fit: 'cover',
        output_dir: null,
        naming: null,
      },
    });
    expect(cb.onOperationComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'social',
        // Summary includes the platform label, preset name, and dims.
        details: 'Instagram · Test square (1080×1080)',
      })
    );
    expect(cb.onStart).toHaveBeenCalledOnce();
    expect(cb.onFinish).toHaveBeenCalledOnce();
  });

  it('video preset routes through resize_videos_batch with maintain_aspect=false + preset CRF', async () => {
    invoke.mockResolvedValue([
      {
        success: true,
        input_path: '/in/clip.mp4',
        output_path: '/out/clip.mp4',
        error: null,
        original_size: 10_000,
        new_size: 6_000,
      },
    ]);
    const cb = noopCallbacks();
    await runSocialPreset({
      preset: videoPreset,
      images: [],
      videos: [video()],
      fields,
      ...cb,
    });

    expect(invoke).toHaveBeenCalledWith('resize_videos_batch', {
      inputPaths: ['/in/clip.mp4'],
      options: expect.objectContaining({
        format: 'mp4',
        mode: 'custom',
        width: 1080,
        height: 1920,
        maintain_aspect: false,
        crf: 23,
        output_dir: null,
      }),
    });
    expect(cb.onOperationComplete).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'social', details: 'TikTok · Test vertical (1080×1920)' })
    );
  });

  it('always calls onFinish, even when invoke rejects', async () => {
    invoke.mockRejectedValue(new Error('boom'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const cb = noopCallbacks();
    await runSocialPreset({
      preset: imagePreset,
      images: [image()],
      videos: [],
      fields,
      ...cb,
    });
    expect(cb.onFinish).toHaveBeenCalledOnce();
  });

  it('skips history when nothing succeeded', async () => {
    invoke.mockResolvedValue([
      {
        success: false,
        input_path: '/in/photo.png',
        output_path: null,
        error: 'Image file is corrupted',
        original_size: 0,
        new_size: 0,
      },
    ]);
    const cb = noopCallbacks();
    await runSocialPreset({
      preset: imagePreset,
      images: [image()],
      videos: [],
      fields,
      ...cb,
    });
    expect(cb.onOperationComplete).not.toHaveBeenCalled();
  });
});
