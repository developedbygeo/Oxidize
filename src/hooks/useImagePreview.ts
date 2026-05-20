import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { ImageInfo } from '@/types/image';

type UseImagePreviewResult = {
  src: string;
  isLoading: boolean;
};

/**
 * Loads a high-resolution preview for the given image via the Tauri backend.
 * Falls back to the thumbnail if the preview fetch fails. Handles cancellation
 * when the image changes mid-load.
 */
export const useImagePreview = (
  image: ImageInfo | undefined,
  maxDimension = 800
): UseImagePreviewResult => {
  const [src, setSrc] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!image) {
      setSrc('');
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    invoke<string>('get_image_preview', { path: image.path, maxDimension })
      .then((result) => {
        if (!cancelled) setSrc(result);
      })
      .catch((error) => {
        console.error('Failed to load preview:', error);
        if (!cancelled) setSrc(image.thumbnail);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [image, maxDimension]);

  return { src, isLoading };
};
