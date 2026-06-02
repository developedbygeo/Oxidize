import { z } from 'zod';
import type { VideoFormat } from '@/types/video';

export const videoOutputFormats: VideoFormat[] = ['mp4', 'webm', 'mkv', 'mov'];

export type ResolutionPreset = {
  height: number;
  label: string;
  description: string;
};

export const resolutionPresets: ResolutionPreset[] = [
  { height: 2160, label: '4K', description: '2160p · 3840×2160 source' },
  { height: 1440, label: '1440p', description: '2K · QHD' },
  { height: 1080, label: '1080p', description: 'Full HD · most common' },
  { height: 720, label: '720p', description: 'HD · smaller files' },
  { height: 480, label: '480p', description: 'SD · web/preview' },
  { height: 360, label: '360p', description: 'Tiny · thumbnails / messaging' },
];

/**
 * Encoder rejects odd dimensions for h.264/VP9. Schema enforces this so a
 * malformed value can never reach ffmpeg.
 */
const evenDimension = z
  .number()
  .int()
  .min(2)
  .max(7680)
  .refine((n) => n % 2 === 0, { message: 'Must be an even number' });

export const videoResizeFormSchema = z.object({
  targetFormat: z.enum(['mp4', 'webm', 'mkv', 'mov', 'avi']),
  mode: z.enum(['presetheight', 'custom']),
  presetHeight: z.number().int().min(144).max(4320),
  customWidth: evenDimension,
  customHeight: evenDimension,
  maintainAspect: z.boolean(),
  crf: z.number().int().min(0).max(51),
  outputDir: z.string().nullable(),
});

export type VideoResizeFormValues = z.infer<typeof videoResizeFormSchema>;

export const defaultFormValues: VideoResizeFormValues = {
  targetFormat: 'mp4',
  mode: 'presetheight',
  presetHeight: 1080,
  customWidth: 1280,
  customHeight: 720,
  maintainAspect: true,
  crf: 23,
  outputDir: null,
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
