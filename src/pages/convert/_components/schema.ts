import { z } from 'zod';
import type { ImageFormat } from '@/types/image';

export const outputFormats: ImageFormat[] = ['png', 'jpg', 'webp', 'avif', 'gif', 'bmp', 'tiff'];

export const formatsWithQuality: ImageFormat[] = ['jpg', 'jpeg', 'webp', 'avif'];

export const convertFormSchema = z.object({
  targetFormat: z.enum(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'ico', 'tiff', 'avif']),
  quality: z.number().int().min(1).max(100),
  outputDir: z.string().nullable(),
  filenameTemplate: z.string(),
  overwriteMode: z.enum(['auto-number', 'skip', 'overwrite']),
});

export type ConvertFormValues = z.infer<typeof convertFormSchema>;

export const defaultFormValues: ConvertFormValues = {
  targetFormat: 'webp',
  quality: 85,
  outputDir: null,
  filenameTemplate: '',
  overwriteMode: 'auto-number',
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
