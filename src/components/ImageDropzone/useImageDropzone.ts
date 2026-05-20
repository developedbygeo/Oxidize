import { useCallback, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import type { ImageInfo } from '@/types/image';

type RustResult = { Ok: ImageInfo } | { Err: string } | ImageInfo;

type UseImageDropzoneArgs = {
  images: ImageInfo[];
  onImagesChange: (images: ImageInfo[]) => void;
  maxImages?: number;
};

export const useImageDropzone = ({
  images,
  onImagesChange,
  maxImages = 50,
}: UseImageDropzoneArgs) => {
  const [isLoading, setIsLoading] = useState(false);

  const selectFiles = useCallback(async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: 'Images',
            extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'ico', 'tiff', 'tif'],
          },
        ],
      });

      if (!selected || (Array.isArray(selected) && selected.length === 0)) return;

      const paths = Array.isArray(selected) ? selected : [selected];
      if (images.length + paths.length > maxImages) {
        console.warn(`Maximum ${maxImages} images allowed`);
        return;
      }

      setIsLoading(true);
      const results = await invoke<RustResult[]>('load_images_batch', { paths });

      const processedImages = results
        .map((r) => {
          if (typeof r === 'object' && r !== null) {
            if ('Ok' in r) return r.Ok;
            if ('path' in r) return r as ImageInfo;
          }
          return null;
        })
        .filter((img): img is ImageInfo => img !== null);

      onImagesChange([...images, ...processedImages]);
    } catch (error) {
      console.error('Failed to load images:', error);
    } finally {
      setIsLoading(false);
    }
  }, [images, onImagesChange, maxImages]);

  const removeImage = useCallback(
    (index: number) => onImagesChange(images.filter((_, i) => i !== index)),
    [images, onImagesChange]
  );

  const clearAll = useCallback(() => onImagesChange([]), [onImagesChange]);

  return { isLoading, selectFiles, removeImage, clearAll };
};
