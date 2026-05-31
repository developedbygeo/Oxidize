import { z } from 'zod';
import type { WatermarkPosition } from '@/types/image';

export const watermarkFormSchema = z.object({
  /** Absolute path to the watermark/logo image. Null until the user picks one. */
  watermarkPath: z.string().nullable(),
  position: z.enum([
    'top-left',
    'top-center',
    'top-right',
    'middle-left',
    'middle-center',
    'middle-right',
    'bottom-left',
    'bottom-center',
    'bottom-right',
  ]),
  /** 0–100 in the UI; converted to a 0–1 fraction before the command runs. */
  opacity: z.number().min(0).max(100),
  /** Watermark width as a percentage of the base image width. */
  scalePercent: z.number().min(1).max(100),
  /** Edge inset as a percentage of base width. */
  marginPercent: z.number().min(0).max(25),
  outputDir: z.string().nullable(),
  filenameTemplate: z.string(),
  overwriteMode: z.enum(['auto-number', 'skip', 'overwrite']),
});

export type WatermarkFormValues = z.infer<typeof watermarkFormSchema>;

export const defaultFormValues: WatermarkFormValues = {
  watermarkPath: null,
  position: 'bottom-right',
  opacity: 100,
  scalePercent: 20,
  marginPercent: 3,
  outputDir: null,
  filenameTemplate: '',
  overwriteMode: 'auto-number',
};

/** No work to do without a watermark image, or when it would be invisible. */
export const isNoop = (values: WatermarkFormValues): boolean =>
  !values.watermarkPath || values.opacity === 0 || values.scalePercent === 0;

type HAlign = 'left' | 'center' | 'right';
type VAlign = 'top' | 'middle' | 'bottom';

/** Split a grid cell into its horizontal + vertical anchors. Shared by the
 *  position grid and the live preview so they agree on placement. */
export const positionToAnchors = (
  position: WatermarkPosition
): { h: HAlign; v: VAlign } => {
  const [v, h] = position.split('-') as [VAlign, HAlign];
  return { h, v };
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
