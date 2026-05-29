import { z } from 'zod';
import { Images, ArrowRightLeft, Minimize2, Sparkles, Wand2, Play, Crop } from 'lucide-react';
import type { ImageFormat, WhiteBalancePreset } from '@/types/image';

export const pipelineSchema = z.object({
  cropEnabled: z.boolean(),
  cropX: z.number().int().min(0),
  cropY: z.number().int().min(0),
  cropWidth: z.number().int().min(0),
  cropHeight: z.number().int().min(0),
  cropAspectRatio: z.enum([
    'free',
    'square',
    'widescreen',
    'classic',
    'dslr',
    'portrait-mobile',
    'portrait-insta',
  ]),

  convertEnabled: z.boolean(),
  convertFormat: z.enum(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'ico', 'tiff']),
  convertQuality: z.number().min(1).max(100),

  compressEnabled: z.boolean(),
  compressQuality: z.number().min(10).max(100),

  beautifyEnabled: z.boolean(),
  brightness: z.number().min(-100).max(100),
  contrast: z.number().min(-100).max(100),
  saturation: z.number().min(-100).max(100),
  sharpness: z.number().min(0).max(100),
  exposure: z.number().min(-100).max(100),
  hueShift: z.number().min(-180).max(180),
  temperature: z.number().min(-100).max(100),
  whiteBalance: z.enum(['auto', 'daylight', 'cloudy', 'tungsten', 'fluorescent']),

  effectsEnabled: z.boolean(),
  effectType: z.enum([
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
  effectIntensity: z.number().min(0).max(100),

  outputDir: z.string().nullable(),
});

export type PipelineFormValues = z.infer<typeof pipelineSchema>;

export const defaultValues: PipelineFormValues = {
  cropEnabled: false,
  cropX: 0,
  cropY: 0,
  cropWidth: 0,
  cropHeight: 0,
  cropAspectRatio: 'free',

  convertEnabled: false,
  convertFormat: 'webp',
  convertQuality: 90,

  compressEnabled: true,
  compressQuality: 80,

  beautifyEnabled: false,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  sharpness: 0,
  exposure: 0,
  hueShift: 0,
  temperature: 0,
  whiteBalance: 'auto',

  effectsEnabled: false,
  effectType: 'grayscale',
  effectIntensity: 50,

  outputDir: null,
};

export const steps = [
  { id: 'images', label: 'Images', icon: Images, description: 'Select files' },
  { id: 'crop', label: 'Crop', icon: Crop, description: 'Trim a region' },
  { id: 'convert', label: 'Convert', icon: ArrowRightLeft, description: 'Change format' },
  { id: 'compress', label: 'Compress', icon: Minimize2, description: 'Reduce size' },
  { id: 'beautify', label: 'Beautify', icon: Sparkles, description: 'Enhance' },
  { id: 'effects', label: 'Effects', icon: Wand2, description: 'Apply filters' },
  { id: 'review', label: 'Review', icon: Play, description: 'Execute' },
] as const;

export type StepId = (typeof steps)[number]['id'];

export const formatOptions: { value: ImageFormat; label: string }[] = [
  { value: 'webp', label: 'WebP' },
  { value: 'png', label: 'PNG' },
  { value: 'jpg', label: 'JPEG' },
  { value: 'gif', label: 'GIF' },
  { value: 'bmp', label: 'BMP' },
  { value: 'tiff', label: 'TIFF' },
];

export const whiteBalanceOptions: { value: WhiteBalancePreset; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'daylight', label: 'Daylight' },
  { value: 'cloudy', label: 'Cloudy' },
  { value: 'tungsten', label: 'Tungsten' },
  { value: 'fluorescent', label: 'Fluorescent' },
];

export const beautifySliders = [
  { name: 'brightness' as const, label: 'Brightness', min: -100, max: 100 },
  { name: 'contrast' as const, label: 'Contrast', min: -100, max: 100 },
  { name: 'saturation' as const, label: 'Saturation', min: -100, max: 100 },
  { name: 'sharpness' as const, label: 'Sharpness', min: 0, max: 100 },
  { name: 'exposure' as const, label: 'Exposure', min: -100, max: 100 },
  { name: 'temperature' as const, label: 'Temperature', min: -100, max: 100 },
];
