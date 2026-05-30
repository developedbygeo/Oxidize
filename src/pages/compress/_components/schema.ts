import { z } from 'zod';

export type CompressionLevel = 'lossless' | 'balanced' | 'maximum';

export const compressionPresets: Record<
  CompressionLevel,
  { quality: number; label: string; description: string }
> = {
  lossless: { quality: 100, label: 'Lossless', description: 'No quality loss, smaller savings' },
  balanced: { quality: 80, label: 'Balanced', description: 'Great quality, good compression' },
  maximum: { quality: 60, label: 'Maximum', description: 'Smaller files, some quality loss' },
};

export const compressionLevelOrder: CompressionLevel[] = ['lossless', 'balanced', 'maximum'];

export const compressFormSchema = z.object({
  compressionLevel: z.enum(['lossless', 'balanced', 'maximum']),
  customQuality: z.number().int().min(10).max(100),
  useCustom: z.boolean(),
  outputDir: z.string().nullable(),
  filenameTemplate: z.string(),
  overwriteMode: z.enum(['auto-number', 'skip', 'overwrite']),
  preserveMetadata: z.boolean(),
});

export type CompressFormValues = z.infer<typeof compressFormSchema>;

export const defaultFormValues: CompressFormValues = {
  compressionLevel: 'balanced',
  customQuality: 80,
  useCustom: false,
  outputDir: null,
  filenameTemplate: '',
  overwriteMode: 'auto-number',
  preserveMetadata: false,
};

export const resolveQuality = (
  values: Pick<CompressFormValues, 'compressionLevel' | 'customQuality' | 'useCustom'>
): number => {
  if (values.compressionLevel === 'lossless') return 100;
  if (values.useCustom) return values.customQuality;
  return compressionPresets[values.compressionLevel].quality;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
