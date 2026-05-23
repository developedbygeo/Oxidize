import type { LucideIcon } from 'lucide-react';
import {
  Contrast,
  Coffee,
  Film,
  Droplets,
  Focus,
  Eclipse,
  Aperture,
  Radio,
  Grid2x2,
  Layers,
} from 'lucide-react';

export interface ImageInfo {
  path: string;
  name: string;
  size: number;
  width: number;
  height: number;
  format: string;
  thumbnail: string;
}

export interface ConversionResult {
  success: boolean;
  output_path: string | null;
  error: string | null;
  original_size: number;
  new_size: number;
}

export interface ConversionOptions {
  format: string;
  quality: number;
  output_dir: string | null;
}

export interface CompressionOptions {
  quality: number;
  output_dir: string | null;
}

export interface CompressionResult {
  success: boolean;
  output_path: string | null;
  error: string | null;
  original_size: number;
  new_size: number;
  savings_percent: number;
}

export type WhiteBalancePreset = 'auto' | 'daylight' | 'cloudy' | 'tungsten' | 'fluorescent';

export interface BeautifyOptions {
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
  exposure: number;
  hue_shift: number;
  temperature: number;
  white_balance: WhiteBalancePreset;
  output_dir: string | null;
}

export interface BeautifyResult {
  success: boolean;
  input_path: string;
  output_path: string | null;
  error: string | null;
  original_size: number;
  new_size: number;
}

export type ImageFormat = 'png' | 'jpg' | 'jpeg' | 'webp' | 'gif' | 'bmp' | 'ico' | 'tiff';

export const formatLabels: Record<ImageFormat, string> = {
  png: 'PNG',
  jpg: 'JPEG',
  jpeg: 'JPEG',
  webp: 'WebP',
  gif: 'GIF',
  bmp: 'BMP',
  ico: 'ICO',
  tiff: 'TIFF',
};

export const formatDescriptions: Record<ImageFormat, string> = {
  png: 'Lossless, supports transparency',
  jpg: 'Best for photos, smaller files',
  jpeg: 'Best for photos, smaller files',
  webp: 'Modern format, great compression',
  gif: 'Supports animation',
  bmp: 'Uncompressed bitmap',
  ico: 'Icon format for Windows',
  tiff: 'High quality, large files',
};

export type OperationType =
  | 'convert'
  | 'compress'
  | 'beautify'
  | 'effects'
  | 'pipeline'
  | 'video-convert'
  | 'video-compress'
  | 'video-resize';

export interface OperationHistoryItem {
  id: string;
  type: OperationType;
  timestamp: number;
  fileCount: number;
  outputDir: string;
  details: string;
  totalSaved?: number;
  savingsPercent?: number;
}

// Effects types
export type EffectType =
  | 'grayscale'
  | 'sepia'
  | 'vintage'
  | 'blur'
  | 'sharpen'
  | 'invert'
  | 'vignette'
  | 'noise'
  | 'pixelate'
  | 'posterize';

export interface EffectOptions {
  effect: EffectType;
  intensity: number; // 0-100
  output_dir: string | null;
}

export interface EffectResult {
  success: boolean;
  input_path: string;
  output_path: string | null;
  error: string | null;
  original_size: number;
  new_size: number;
}

export interface PipelineBeautifyParams {
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
  exposure: number;
  hue_shift: number;
  temperature: number;
  white_balance: WhiteBalancePreset;
}

export interface PipelineEffectParams {
  effect: EffectType;
  intensity: number;
}

export interface PipelineConvertParams {
  format: ImageFormat;
  quality: number;
}

export interface PipelineCompressParams {
  quality: number;
}

export interface PipelineOptions {
  beautify: PipelineBeautifyParams | null;
  effects: PipelineEffectParams | null;
  convert: PipelineConvertParams | null;
  compress: PipelineCompressParams | null;
  output_dir: string | null;
}

export interface PipelineResult {
  success: boolean;
  input_path: string;
  output_path: string | null;
  error: string | null;
  original_size: number;
  new_size: number;
}

export interface EffectInfo {
  type: EffectType;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const effectsList: EffectInfo[] = [
  { type: 'grayscale', label: 'Grayscale', description: 'Convert to black & white', icon: Contrast },
  { type: 'sepia', label: 'Sepia', description: 'Warm brownish tone', icon: Coffee },
  { type: 'vintage', label: 'Vintage', description: 'Retro film look', icon: Film },
  { type: 'blur', label: 'Blur', description: 'Soft gaussian blur', icon: Droplets },
  { type: 'sharpen', label: 'Sharpen', description: 'Enhance details', icon: Focus },
  { type: 'invert', label: 'Invert', description: 'Negative colors', icon: Eclipse },
  { type: 'vignette', label: 'Vignette', description: 'Dark corners', icon: Aperture },
  { type: 'noise', label: 'Noise', description: 'Film grain effect', icon: Radio },
  { type: 'pixelate', label: 'Pixelate', description: 'Retro pixel art', icon: Grid2x2 },
  { type: 'posterize', label: 'Posterize', description: 'Reduce color levels', icon: Layers },
];
