import { z } from 'zod';

export const effectsFormSchema = z.object({
  selectedEffect: z.enum([
    'grayscale',
    'sepia',
    'vintage',
    'blur',
    'sharpen',
    'invert',
    'vignette',
    'noise',
    'pixelate',
    'posterize',
  ]),
  intensity: z.number().int().min(0).max(100),
  outputDir: z.string().nullable(),
  filenameTemplate: z.string(),
  overwriteMode: z.enum(['auto-number', 'skip', 'overwrite']),
});

export type EffectsFormValues = z.infer<typeof effectsFormSchema>;

export const defaultFormValues: EffectsFormValues = {
  selectedEffect: 'grayscale',
  intensity: 50,
  outputDir: null,
  filenameTemplate: '',
  overwriteMode: 'auto-number',
};
