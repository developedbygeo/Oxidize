import { z } from 'zod';
import type { LucideIcon } from 'lucide-react';
import {
  Sun,
  CloudSun,
  Lightbulb,
  Lamp,
  RefreshCw,
  Contrast,
  Droplets,
  Focus,
  Aperture,
  Palette,
  Thermometer,
} from 'lucide-react';
import type { WhiteBalancePreset } from '@/types/image';

export const beautifyFormSchema = z.object({
  brightness: z.number().int().min(-100).max(100),
  contrast: z.number().int().min(-100).max(100),
  saturation: z.number().int().min(-100).max(100),
  sharpness: z.number().int().min(-100).max(100),
  exposure: z.number().int().min(-100).max(100),
  hue_shift: z.number().int().min(-180).max(180),
  temperature: z.number().int().min(-100).max(100),
  white_balance: z.enum(['auto', 'daylight', 'cloudy', 'tungsten', 'fluorescent']),
  outputDir: z.string().nullable(),
  filenameTemplate: z.string(),
  overwriteMode: z.enum(['auto-number', 'skip', 'overwrite']),
});

export type BeautifyFormValues = z.infer<typeof beautifyFormSchema>;

/** Just the per-pixel adjustment fields — used by panels that don't care
 *  about output dir or filename settings. */
export type Adjustments = Omit<
  BeautifyFormValues,
  'outputDir' | 'filenameTemplate' | 'overwriteMode'
>;

export const defaultFormValues: BeautifyFormValues = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  sharpness: 0,
  exposure: 0,
  hue_shift: 0,
  temperature: 0,
  white_balance: 'daylight',
  outputDir: null,
  filenameTemplate: '',
  overwriteMode: 'auto-number',
};

export const defaultAdjustments: Adjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  sharpness: 0,
  exposure: 0,
  hue_shift: 0,
  temperature: 0,
  white_balance: 'daylight',
};

type SliderField = Exclude<keyof Adjustments, 'white_balance'>;

export const basicSliders: {
  name: SliderField;
  label: string;
  min: number;
  max: number;
  icon: LucideIcon;
}[] = [
  { name: 'brightness', label: 'Brightness', min: -100, max: 100, icon: Sun },
  { name: 'contrast', label: 'Contrast', min: -100, max: 100, icon: Contrast },
  { name: 'saturation', label: 'Saturation', min: -100, max: 100, icon: Droplets },
  { name: 'sharpness', label: 'Sharpness', min: -100, max: 100, icon: Focus },
  { name: 'exposure', label: 'Exposure', min: -100, max: 100, icon: Aperture },
];

export const colorSliders: {
  name: SliderField;
  label: string;
  min: number;
  max: number;
  icon: LucideIcon;
  unit?: string;
}[] = [
  { name: 'hue_shift', label: 'Hue Shift', min: -180, max: 180, icon: Palette, unit: '°' },
  { name: 'temperature', label: 'Temperature', min: -100, max: 100, icon: Thermometer },
];

export const whiteBalancePresets: {
  value: WhiteBalancePreset;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: 'auto', label: 'Auto', icon: RefreshCw },
  { value: 'daylight', label: 'Day', icon: Sun },
  { value: 'cloudy', label: 'Cloud', icon: CloudSun },
  { value: 'tungsten', label: 'Bulb', icon: Lightbulb },
  { value: 'fluorescent', label: 'Fluo', icon: Lamp },
];

export const hasChanges = (a: Adjustments): boolean =>
  Object.entries(a).some(([key, value]) => {
    if (key === 'white_balance') return value !== 'daylight';
    return value !== 0;
  });
