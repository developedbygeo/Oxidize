import { z } from 'zod';
import type { VideoFormat } from '@/types/video';

export const videoOutputFormats: VideoFormat[] = ['mp4', 'webm', 'mkv', 'mov'];

export type VideoEncodingPreset =
  | 'ultrafast'
  | 'superfast'
  | 'veryfast'
  | 'faster'
  | 'fast'
  | 'medium'
  | 'slow'
  | 'slower'
  | 'veryslow';

export const presetOrder: VideoEncodingPreset[] = [
  'ultrafast',
  'superfast',
  'veryfast',
  'faster',
  'fast',
  'medium',
  'slow',
  'slower',
  'veryslow',
];

export const presetLabels: Record<VideoEncodingPreset, string> = {
  ultrafast: 'Ultrafast',
  superfast: 'Superfast',
  veryfast: 'Very fast',
  faster: 'Faster',
  fast: 'Fast',
  medium: 'Medium',
  slow: 'Slow',
  slower: 'Slower',
  veryslow: 'Very slow',
};

export const videoCompressFormSchema = z.object({
  targetFormat: z.enum(['mp4', 'webm', 'mkv', 'mov', 'avi']),
  mode: z.enum(['crf', 'bitrate']),
  crf: z.number().int().min(0).max(51),
  bitrateKbps: z.number().int().min(100).max(50000),
  preset: z.enum(presetOrder),
  outputDir: z.string().nullable(),
});

export type VideoCompressFormValues = z.infer<typeof videoCompressFormSchema>;

export const defaultFormValues: VideoCompressFormValues = {
  targetFormat: 'mp4',
  mode: 'crf',
  crf: 23,
  bitrateKbps: 2000,
  preset: 'medium',
  outputDir: null,
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
