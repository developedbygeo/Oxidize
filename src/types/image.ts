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

export type OperationType = 'convert' | 'compress' | 'beautify' | 'effects';

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

export interface EffectInfo {
  type: EffectType;
  label: string;
  description: string;
  gradient: string;
  icon: string;
}

export const effectsList: EffectInfo[] = [
  { type: 'grayscale', label: 'Grayscale', description: 'Convert to black & white', gradient: 'from-slate-400 to-slate-600', icon: '🌑' },
  { type: 'sepia', label: 'Sepia', description: 'Warm brownish tone', gradient: 'from-amber-600 to-yellow-700', icon: '🟤' },
  { type: 'vintage', label: 'Vintage', description: 'Retro film look', gradient: 'from-rose-400 to-amber-500', icon: '📷' },
  { type: 'blur', label: 'Blur', description: 'Soft gaussian blur', gradient: 'from-blue-400 to-indigo-500', icon: '💨' },
  { type: 'sharpen', label: 'Sharpen', description: 'Enhance details', gradient: 'from-emerald-400 to-teal-500', icon: '🔪' },
  { type: 'invert', label: 'Invert', description: 'Negative colors', gradient: 'from-purple-400 to-pink-500', icon: '🔄' },
  { type: 'vignette', label: 'Vignette', description: 'Dark corners', gradient: 'from-gray-600 to-gray-800', icon: '🔲' },
  { type: 'noise', label: 'Noise', description: 'Film grain effect', gradient: 'from-orange-400 to-red-500', icon: '📺' },
  { type: 'pixelate', label: 'Pixelate', description: 'Retro pixel art', gradient: 'from-cyan-400 to-blue-500', icon: '🎮' },
  { type: 'posterize', label: 'Posterize', description: 'Reduce color levels', gradient: 'from-pink-400 to-purple-500', icon: '🎨' },
];
