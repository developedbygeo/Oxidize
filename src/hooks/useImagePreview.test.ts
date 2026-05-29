import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ImageInfo } from '@/types/image';

const invoke = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}));

const { useImagePreview } = await import('./useImagePreview');

const makeImage = (overrides: Partial<ImageInfo> = {}): ImageInfo => ({
  path: '/in/photo.png',
  name: 'photo.png',
  size: 1024,
  width: 1000,
  height: 800,
  format: 'png',
  thumbnail: 'data:thumbnail',
  ...overrides,
});

beforeEach(() => {
  invoke.mockReset();
});

describe('useImagePreview', () => {
  it('returns an empty src and not-loading when image is undefined', () => {
    const { result } = renderHook(() => useImagePreview(undefined));
    expect(result.current.src).toBe('');
    expect(result.current.isLoading).toBe(false);
  });

  it('calls get_image_preview with the requested max dimension', async () => {
    invoke.mockResolvedValue('data:preview-uri');
    const { result } = renderHook(() => useImagePreview(makeImage(), 1200));
    await waitFor(() => expect(result.current.src).toBe('data:preview-uri'));
    expect(invoke).toHaveBeenCalledWith('get_image_preview', {
      path: '/in/photo.png',
      maxDimension: 1200,
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('falls back to the thumbnail when invoke rejects', async () => {
    invoke.mockRejectedValue(new Error('preview failed'));
    const { result } = renderHook(() => useImagePreview(makeImage()));
    await waitFor(() => expect(result.current.src).toBe('data:thumbnail'));
    expect(result.current.isLoading).toBe(false);
  });

  it('ignores a stale invoke result when the image prop changes mid-load', async () => {
    let resolveFirst!: (v: string) => void;
    invoke
      .mockReturnValueOnce(new Promise<string>((r) => (resolveFirst = r)))
      .mockResolvedValueOnce('data:second');

    const first = makeImage({ path: '/in/first.png' });
    const second = makeImage({ path: '/in/second.png' });

    const { result, rerender } = renderHook(
      ({ image }: { image: ImageInfo }) => useImagePreview(image),
      { initialProps: { image: first } }
    );

    rerender({ image: second });
    // Resolve the stale first request after switching images.
    resolveFirst('data:first');

    await waitFor(() => expect(result.current.src).toBe('data:second'));
    expect(result.current.src).not.toBe('data:first');
  });
});
