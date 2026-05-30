import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { useOsDrag } from '@/hooks/useOsDrag';
import { fileSizeWarning } from '@/lib/file-size-warnings';
import type { VideoInfo } from '@/types/video';

type RustResult = { Ok: VideoInfo } | { Err: string };

const VIDEO_EXTENSIONS = [
  'mp4',
  'webm',
  'mkv',
  'mov',
  'avi',
  'm4v',
  'wmv',
  'flv',
  'mpg',
  'mpeg',
];

const matchesVideoExtension = (path: string): boolean => {
  const lower = path.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(`.${ext}`));
};

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

  const addPaths = useCallback(
    async (paths: string[]) => {
      if (paths.length === 0) return;
      if (videos.length + paths.length > maxVideos) {
        console.warn(`Maximum ${maxVideos} videos allowed`);
        return;
      }

      setIsLoading(true);
      try {
        const results = await invoke<RustResult[]>('load_videos_batch', { paths });

        const processed = results
          .map((r) => {
            if (r && typeof r === 'object' && 'Ok' in r) return r.Ok;
            return null;
          })
          .filter((v): v is VideoInfo => v !== null);

        const warning = fileSizeWarning(processed, 'video');
        if (warning) toast.warning(warning.title, { description: warning.description });

        onVideosChange([...videos, ...processed]);
      } catch (error) {
        console.error('Failed to load videos:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [videos, onVideosChange, maxVideos]
  );

  const selectFiles = useCallback(async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: 'Videos', extensions: VIDEO_EXTENSIONS }],
      });

      if (!selected || (Array.isArray(selected) && selected.length === 0)) return;
      const paths = Array.isArray(selected) ? selected : [selected];
      await addPaths(paths);
    } catch (error) {
      console.error('Failed to open file picker:', error);
    }
  }, [addPaths]);

  const { isOsDragOver } = useOsDrag({ onDrop: addPaths, accept: matchesVideoExtension });

  const removeVideo = useCallback(
    (index: number) => onVideosChange(videos.filter((_, i) => i !== index)),
    [videos, onVideosChange]
  );

  const clearAll = useCallback(() => onVideosChange([]), [onVideosChange]);

  return { isLoading, isOsDragOver, selectFiles, removeVideo, clearAll };
};
