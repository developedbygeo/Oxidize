import { z } from 'zod';

export const aspectRatios = [
  { id: 'free', label: 'Free', ratio: null },
  { id: 'square', label: '1:1', ratio: 1 },
  { id: 'widescreen', label: '16:9', ratio: 16 / 9 },
  { id: 'classic', label: '4:3', ratio: 4 / 3 },
  { id: 'dslr', label: '3:2', ratio: 3 / 2 },
  { id: 'portrait-mobile', label: '9:16', ratio: 9 / 16 },
  { id: 'portrait-insta', label: '4:5', ratio: 4 / 5 },
] as const;

export type AspectRatioId = (typeof aspectRatios)[number]['id'];

export const cropFormSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  // 0 is the "no rect drawn yet" state — runCrop short-circuits on it.
  width: z.number().int().min(0),
  height: z.number().int().min(0),
  aspectRatio: z.enum([
    'free',
    'square',
    'widescreen',
    'classic',
    'dslr',
    'portrait-mobile',
    'portrait-insta',
  ]),
  outputDir: z.string().nullable(),
  filenameTemplate: z.string(),
  overwriteMode: z.enum(['auto-number', 'skip', 'overwrite']),
});

export type CropFormValues = z.infer<typeof cropFormSchema>;

export const defaultFormValues: CropFormValues = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  aspectRatio: 'free',
  outputDir: null,
  filenameTemplate: '',
  overwriteMode: 'auto-number',
};

export const getRatioById = (id: AspectRatioId): number | null =>
  aspectRatios.find((r) => r.id === id)?.ratio ?? null;
