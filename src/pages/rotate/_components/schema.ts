import { z } from 'zod';

export const rotateFormSchema = z.object({
  rotationDegrees: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  flipHorizontal: z.boolean(),
  flipVertical: z.boolean(),
  outputDir: z.string().nullable(),
  filenameTemplate: z.string(),
  overwriteMode: z.enum(['auto-number', 'skip', 'overwrite']),
});

export type RotateFormValues = z.infer<typeof rotateFormSchema>;

export const defaultFormValues: RotateFormValues = {
  rotationDegrees: 0,
  flipHorizontal: false,
  flipVertical: false,
  outputDir: null,
  filenameTemplate: '',
  overwriteMode: 'auto-number',
};

/** True when the form values would leave images untouched — mirrors the
 *  Rust `rotate::is_noop` so the UI can disable the run button. */
export const isNoop = (values: RotateFormValues): boolean =>
  values.rotationDegrees === 0 && !values.flipHorizontal && !values.flipVertical;

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
