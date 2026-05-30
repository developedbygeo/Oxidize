import { z } from 'zod';

export const socialFormSchema = z.object({
  /** Currently-selected preset id; null when none picked yet. */
  selectedPresetId: z.string().nullable(),
  outputDir: z.string().nullable(),
  filenameTemplate: z.string(),
  overwriteMode: z.enum(['auto-number', 'skip', 'overwrite']),
});

export type SocialFormValues = z.infer<typeof socialFormSchema>;

export const defaultFormValues: SocialFormValues = {
  selectedPresetId: null,
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
