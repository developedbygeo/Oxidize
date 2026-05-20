import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { VideoProgressPayload } from '@/types/video';

const PROGRESS_EVENT = 'video:progress';

/**
 * Subscribes to ffmpeg progress events from the backend.
 *
 * Returns a map keyed by input path → progress fraction (0..1). The backend
 * emits one event per ffmpeg progress block (roughly every few frames).
 *
 * Pass `enabled: false` to skip the listener entirely (e.g. when no job is
 * running), so we're not paying the IPC cost for stale events.
 */
export const useFfmpegProgress = (enabled = true): Record<string, number> => {
  const [progress, setProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!enabled) {
      setProgress({});
      return;
    }

    let cancelled = false;
    const unlisten = listen<VideoProgressPayload>(PROGRESS_EVENT, (event) => {
      if (cancelled) return;
      const { input_path, progress: p } = event.payload;
      setProgress((prev) => ({ ...prev, [input_path]: p }));
    });

    return () => {
      cancelled = true;
      unlisten.then((fn) => fn()).catch(() => {});
    };
  }, [enabled]);

  return progress;
};
