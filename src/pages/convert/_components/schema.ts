import type { ImageInfo, ImageFormat, ConversionResult } from '@/types/image';

export const outputFormats: ImageFormat[] = ['png', 'jpg', 'webp', 'gif', 'bmp', 'tiff'];

export const formatsWithQuality: ImageFormat[] = ['jpg', 'jpeg', 'webp'];

export type ConvertState = {
  images: ImageInfo[];
  targetFormat: ImageFormat;
  quality: number;
  outputDir: string | null;
  isConverting: boolean;
  results: ConversionResult[];
  showResults: boolean;
};

export type ConvertAction =
  | { type: 'SET_IMAGES'; payload: ImageInfo[] }
  | { type: 'SET_TARGET_FORMAT'; payload: ImageFormat }
  | { type: 'SET_QUALITY'; payload: number }
  | { type: 'SET_OUTPUT_DIR'; payload: string | null }
  | { type: 'START_CONVERTING' }
  | { type: 'FINISH_CONVERTING'; payload: ConversionResult[] };

export const initialState: ConvertState = {
  images: [],
  targetFormat: 'webp',
  quality: 85,
  outputDir: null,
  isConverting: false,
  results: [],
  showResults: false,
};

export const convertReducer = (state: ConvertState, action: ConvertAction): ConvertState => {
  switch (action.type) {
    case 'SET_IMAGES':
      return { ...state, images: action.payload };
    case 'SET_TARGET_FORMAT':
      return { ...state, targetFormat: action.payload };
    case 'SET_QUALITY':
      return { ...state, quality: action.payload };
    case 'SET_OUTPUT_DIR':
      return { ...state, outputDir: action.payload };
    case 'START_CONVERTING':
      return { ...state, isConverting: true, showResults: false };
    case 'FINISH_CONVERTING':
      return { ...state, isConverting: false, results: action.payload, showResults: true };
    default:
      return state;
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
