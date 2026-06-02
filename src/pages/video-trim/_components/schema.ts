import { z } from 'zod';
import type { VideoInfo } from '@/types/video';

export type TrimSpec = { start: number; end: number };

export const videoTrimFormSchema = z.object({
  mode: z.enum(['accurate', 'fast']),
  crf: z.number().int().min(0).max(51),
  outputDir: z.string().nullable(),
});

export type VideoTrimFormValues = z.infer<typeof videoTrimFormSchema>;

export const defaultFormValues: VideoTrimFormValues = {
  mode: 'accurate',
  crf: 23,
  outputDir: null,
};

/**
 * Recomputes the trims map when the loaded videos change: keep existing
 * trim points for paths still present, initialize new ones to the full
 * duration. Per-video state stays as plain `useState` because the shape is
 * dynamic and keyed by file path — not a natural fit for RHF.
 */
export const trimsForVideos = (
  existing: Record<string, TrimSpec>,
  videos: VideoInfo[]
): Record<string, TrimSpec> => {
  const next: Record<string, TrimSpec> = {};
  for (const v of videos) {
    next[v.path] = existing[v.path] ?? { start: 0, end: v.duration_seconds };
  }
  return next;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
