import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';

const PROGRESS_EVENT = 'image:progress';

type ImageProgressPayload = {
  input_path: string;
  /** Fraction 0.0..=1.0. Image batches don't have sub-file progress — each
   *  completed item emits 1.0. */
  progress: number;
};

/**
 * Subscribes to per-file progress events from `*_images_batch` commands.
 *
 * Returns a map keyed by input path → progress fraction (0..1). With image
 * batches each file is binary (0 pending, 1 done) — the aggregated overall
 * comes from summing and dividing by total in `JobProgressBar`.
 *
 * Pass `enabled: false` to skip the listener so we're not paying the IPC
 * cost for stale events while idle.
 */
export const useImageProgress = (enabled = true): Record<string, number> => {
  const [progress, setProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!enabled) {
      setProgress({});
      return;
    }

    let cancelled = false;
    const unlisten = listen<ImageProgressPayload>(PROGRESS_EVENT, (event) => {
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
