import type { ImageInfo, EffectType, EffectResult } from '@/types/image';

export type EffectsState = {
  images: ImageInfo[];
  selectedEffect: EffectType;
  intensity: number;
  outputDir: string | null;
  isProcessing: boolean;
  results: EffectResult[];
  showResults: boolean;
  previewIndex: number;
};

export type EffectsAction =
  | { type: 'SET_IMAGES'; payload: ImageInfo[] }
  | { type: 'SET_SELECTED_EFFECT'; payload: EffectType }
  | { type: 'SET_INTENSITY'; payload: number }
  | { type: 'SET_OUTPUT_DIR'; payload: string | null }
  | { type: 'START_PROCESSING' }
  | { type: 'FINISH_PROCESSING'; payload: EffectResult[] }
  | { type: 'SET_PREVIEW_INDEX'; payload: number }
  | { type: 'REMOVE_IMAGE'; payload: number };

export const initialState: EffectsState = {
  images: [],
  selectedEffect: 'grayscale',
  intensity: 50,
  outputDir: null,
  isProcessing: false,
  results: [],
  showResults: false,
  previewIndex: 0,
};

export const effectsReducer = (state: EffectsState, action: EffectsAction): EffectsState => {
  switch (action.type) {
    case 'SET_IMAGES':
      return { ...state, images: action.payload };
    case 'SET_SELECTED_EFFECT':
      return { ...state, selectedEffect: action.payload };
    case 'SET_INTENSITY':
      return { ...state, intensity: action.payload };
    case 'SET_OUTPUT_DIR':
      return { ...state, outputDir: action.payload };
    case 'START_PROCESSING':
      return { ...state, isProcessing: true, showResults: false };
    case 'FINISH_PROCESSING':
      return { ...state, isProcessing: false, results: action.payload, showResults: true };
    case 'SET_PREVIEW_INDEX':
      return { ...state, previewIndex: action.payload };
    case 'REMOVE_IMAGE': {
      const newImages = state.images.filter((_, i) => i !== action.payload);
      const newPreviewIndex =
        state.previewIndex >= newImages.length
          ? Math.max(0, newImages.length - 1)
          : state.previewIndex;
      return { ...state, images: newImages, previewIndex: newPreviewIndex };
    }
    default:
      return state;
  }
};
