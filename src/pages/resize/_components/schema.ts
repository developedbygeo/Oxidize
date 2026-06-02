import { z } from 'zod';

/** Constrains both dims to a sane upper bound — anything > 16k is almost
 *  certainly a user typo (or a request the encoder will reject anyway). */
const MAX_DIMENSION = 16_384;

export const resizeFormSchema = z
  .object({
    /** When null, derived from height + source aspect ratio at process time. */
    width: z.number().int().min(1).max(MAX_DIMENSION).nullable(),
    /** When null, derived from width + source aspect ratio at process time. */
    height: z.number().int().min(1).max(MAX_DIMENSION).nullable(),
    fit: z.enum(['stretch', 'contain', 'cover']),
    outputDir: z.string().nullable(),
    filenameTemplate: z.string(),
    overwriteMode: z.enum(['auto-number', 'skip', 'overwrite']),
  })
  .refine((v) => v.width !== null || v.height !== null, {
    message: 'Set at least one dimension',
    path: ['width'],
  });

export type ResizeFormValues = z.infer<typeof resizeFormSchema>;

export const defaultFormValues: ResizeFormValues = {
  width: 1920,
  height: null,
  fit: 'cover',
  outputDir: null,
  filenameTemplate: '',
  overwriteMode: 'auto-number',
};

/** True when the form values would produce no work — both dimensions empty. */
export const isNoop = (values: ResizeFormValues): boolean =>
  values.width === null && values.height === null;

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
