import { useCallback, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import type { VideoInfo } from '@/types/video';

type RustResult = { Ok: VideoInfo } | { Err: string };

type UseVideoDropzoneArgs = {
  videos: VideoInfo[];
  onVideosChange: (videos: VideoInfo[]) => void;
  maxVideos?: number;
};

export const useVideoDropzone = ({
  videos,
  onVideosChange,
  maxVideos = 20,
}: UseVideoDropzoneArgs) => {
  const [isLoading, setIsLoading] = useState(false);

  const selectFiles = useCallback(async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: 'Videos',
            extensions: ['mp4', 'webm', 'mkv', 'mov', 'avi', 'm4v', 'wmv', 'flv', 'mpg', 'mpeg'],
          },
        ],
      });

      if (!selected || (Array.isArray(selected) && selected.length === 0)) return;

      const paths = Array.isArray(selected) ? selected : [selected];
      if (videos.length + paths.length > maxVideos) {
        console.warn(`Maximum ${maxVideos} videos allowed`);
        return;
      }

      setIsLoading(true);
      const results = await invoke<RustResult[]>('load_videos_batch', { paths });

      const processed = results
        .map((r) => {
          if (r && typeof r === 'object') {
            if ('Ok' in r) return r.Ok;
          }
          return null;
        })
        .filter((v): v is VideoInfo => v !== null);

      onVideosChange([...videos, ...processed]);
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [videos, onVideosChange, maxVideos]);

  const removeVideo = useCallback(
    (index: number) => onVideosChange(videos.filter((_, i) => i !== index)),
    [videos, onVideosChange]
  );

  const clearAll = useCallback(() => onVideosChange([]), [onVideosChange]);

  return { isLoading, selectFiles, removeVideo, clearAll };
};
