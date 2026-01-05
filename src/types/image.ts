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
