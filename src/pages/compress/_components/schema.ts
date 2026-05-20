import type { ImageInfo, CompressionResult } from '@/types/image';

export type CompressionLevel = 'lossless' | 'balanced' | 'maximum';

export const compressionPresets: Record<
  CompressionLevel,
  { quality: number; label: string; description: string }
> = {
  lossless: { quality: 100, label: 'Lossless', description: 'No quality loss, smaller savings' },
  balanced: { quality: 80, label: 'Balanced', description: 'Great quality, good compression' },
  maximum: { quality: 60, label: 'Maximum', description: 'Smaller files, some quality loss' },
};

export const compressionLevelOrder: CompressionLevel[] = ['lossless', 'balanced', 'maximum'];

export type CompressState = {
  images: ImageInfo[];
  compressionLevel: CompressionLevel;
  customQuality: number;
  useCustom: boolean;
  outputDir: string | null;
  isCompressing: boolean;
  results: CompressionResult[];
  showResults: boolean;
};

export type CompressAction =
  | { type: 'SET_IMAGES'; payload: ImageInfo[] }
  | { type: 'SET_COMPRESSION_LEVEL'; payload: CompressionLevel }
  | { type: 'SET_CUSTOM_QUALITY'; payload: number }
  | { type: 'SET_USE_CUSTOM'; payload: boolean }
  | { type: 'SET_OUTPUT_DIR'; payload: string | null }
  | { type: 'START_COMPRESSING' }
  | { type: 'FINISH_COMPRESSING'; payload: CompressionResult[] };

export const initialState: CompressState = {
  images: [],
  compressionLevel: 'balanced',
  customQuality: 80,
  useCustom: false,
  outputDir: null,
  isCompressing: false,
  results: [],
  showResults: false,
};

export const compressReducer = (state: CompressState, action: CompressAction): CompressState => {
  switch (action.type) {
    case 'SET_IMAGES':
      return { ...state, images: action.payload };
    case 'SET_COMPRESSION_LEVEL':
      return { ...state, compressionLevel: action.payload, useCustom: false };
    case 'SET_CUSTOM_QUALITY':
      return { ...state, customQuality: action.payload, useCustom: true };
    case 'SET_USE_CUSTOM':
      return { ...state, useCustom: action.payload };
    case 'SET_OUTPUT_DIR':
      return { ...state, outputDir: action.payload };
    case 'START_COMPRESSING':
      return { ...state, isCompressing: true, showResults: false };
    case 'FINISH_COMPRESSING':
      return { ...state, isCompressing: false, results: action.payload, showResults: true };
    default:
      return state;
  }
};

export const resolveQuality = (state: Pick<CompressState, 'compressionLevel' | 'customQuality' | 'useCustom'>): number => {
  if (state.compressionLevel === 'lossless') return 100;
  if (state.useCustom) return state.customQuality;
  return compressionPresets[state.compressionLevel].quality;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
