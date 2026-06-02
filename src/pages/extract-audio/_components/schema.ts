import { z } from 'zod';

export const extractAudioFormSchema = z.object({
  targetFormat: z.enum(['mp3', 'aac', 'opus', 'flac', 'wav']),
  bitrateKbps: z.number().int().min(32).max(512),
  outputDir: z.string().nullable(),
});

export type ExtractAudioFormValues = z.infer<typeof extractAudioFormSchema>;

export const defaultFormValues: ExtractAudioFormValues = {
  targetFormat: 'mp3',
  bitrateKbps: 192,
  outputDir: null,
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
