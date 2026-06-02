import { z } from 'zod';
import type { VideoFormat } from '@/types/video';

export const videoOutputFormats: VideoFormat[] = ['mp4', 'webm', 'mkv', 'mov'];

export const videoConvertFormSchema = z.object({
  targetFormat: z.enum(['mp4', 'webm', 'mkv', 'mov', 'avi']),
  mode: z.enum(['reencode', 'remux']),
  crf: z.number().int().min(0).max(51),
  outputDir: z.string().nullable(),
});

export type VideoConvertFormValues = z.infer<typeof videoConvertFormSchema>;

export const defaultFormValues: VideoConvertFormValues = {
  targetFormat: 'mp4',
  mode: 'reencode',
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
