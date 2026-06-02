import { z } from 'zod';
import type { VideoFormat } from '@/types/video';

export const videoOutputFormats: VideoFormat[] = ['mp4', 'webm', 'mkv', 'mov'];

export const videoWatermarkFormSchema = z.object({
  targetFormat: z.enum(['mp4', 'webm', 'mkv', 'mov', 'avi']),
  /** Absolute path to the watermark image. Null until the user picks one. */
  watermarkPath: z.string().nullable(),
  position: z.enum([
    'top-left',
    'top-center',
    'top-right',
    'middle-left',
    'middle-center',
    'middle-right',
    'bottom-left',
    'bottom-center',
    'bottom-right',
  ]),
  /** 0–100 in the UI; converted to a 0–1 fraction before the command runs. */
  opacity: z.number().min(0).max(100),
  scalePercent: z.number().min(1).max(100),
  marginPercent: z.number().min(0).max(25),
  crf: z.number().int().min(0).max(51),
  outputDir: z.string().nullable(),
});

export type VideoWatermarkFormValues = z.infer<typeof videoWatermarkFormSchema>;

export const defaultFormValues: VideoWatermarkFormValues = {
  targetFormat: 'mp4',
  watermarkPath: null,
  position: 'bottom-right',
  opacity: 100,
  scalePercent: 20,
  marginPercent: 3,
  crf: 23,
  outputDir: null,
};

export const isNoop = (values: VideoWatermarkFormValues): boolean =>
  !values.watermarkPath || values.opacity === 0 || values.scalePercent === 0;

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
