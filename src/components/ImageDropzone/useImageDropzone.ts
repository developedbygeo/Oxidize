import { useCallback, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { useOsDrag } from '@/hooks/useOsDrag';
import type { ImageInfo } from '@/types/image';

type RustResult = { Ok: ImageInfo } | { Err: string } | ImageInfo;

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'ico', 'tiff', 'tif'];

const matchesImageExtension = (path: string): boolean => {
  const lower = path.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(`.${ext}`));
};

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

  const addPaths = useCallback(
    async (paths: string[]) => {
      if (paths.length === 0) return;
      if (images.length + paths.length > maxImages) {
        console.warn(`Maximum ${maxImages} images allowed`);
        return;
      }

      setIsLoading(true);
      try {
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
    },
    [images, onImagesChange, maxImages]
  );

  const selectFiles = useCallback(async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: 'Images', extensions: IMAGE_EXTENSIONS }],
      });

      if (!selected || (Array.isArray(selected) && selected.length === 0)) return;
      const paths = Array.isArray(selected) ? selected : [selected];
      await addPaths(paths);
    } catch (error) {
      console.error('Failed to open file picker:', error);
    }
  }, [addPaths]);

  // OS-native drag-and-drop. The Tauri window fires drop events with real
  // paths and also signals enter/over/leave so the dropzone can light up
  // before the drop happens — HTML drag events don't fire for native OS drags.
  const { isOsDragOver } = useOsDrag({ onDrop: addPaths, accept: matchesImageExtension });

  const removeImage = useCallback(
    (index: number) => onImagesChange(images.filter((_, i) => i !== index)),
    [images, onImagesChange]
  );

  const clearAll = useCallback(() => onImagesChange([]), [onImagesChange]);

  return { isLoading, isOsDragOver, selectFiles, removeImage, clearAll };
};
