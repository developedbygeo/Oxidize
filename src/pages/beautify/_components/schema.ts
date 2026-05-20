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
import type {
  ImageInfo,
  BeautifyResult,
  WhiteBalancePreset,
} from '@/types/image';

export type Adjustments = {
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
  exposure: number;
  hue_shift: number;
  temperature: number;
  white_balance: WhiteBalancePreset;
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

export type BeautifyState = {
  images: ImageInfo[];
  adjustments: Adjustments;
  outputDir: string | null;
  isBeautifying: boolean;
  results: BeautifyResult[];
  showResults: boolean;
  previewIndex: number;
};

export type BeautifyAction =
  | { type: 'SET_IMAGES'; payload: ImageInfo[] }
  | { type: 'SET_ADJUSTMENT'; payload: Partial<Adjustments> }
  | { type: 'RESET_ADJUSTMENTS' }
  | { type: 'SET_OUTPUT_DIR'; payload: string | null }
  | { type: 'START_BEAUTIFYING' }
  | { type: 'FINISH_BEAUTIFYING'; payload: BeautifyResult[] }
  | { type: 'SET_PREVIEW_INDEX'; payload: number }
  | { type: 'REMOVE_IMAGE'; payload: number };

export const initialState: BeautifyState = {
  images: [],
  adjustments: defaultAdjustments,
  outputDir: null,
  isBeautifying: false,
  results: [],
  showResults: false,
  previewIndex: 0,
};

export const beautifyReducer = (state: BeautifyState, action: BeautifyAction): BeautifyState => {
  switch (action.type) {
    case 'SET_IMAGES':
      return { ...state, images: action.payload };
    case 'SET_ADJUSTMENT':
      return { ...state, adjustments: { ...state.adjustments, ...action.payload } };
    case 'RESET_ADJUSTMENTS':
      return { ...state, adjustments: defaultAdjustments };
    case 'SET_OUTPUT_DIR':
      return { ...state, outputDir: action.payload };
    case 'START_BEAUTIFYING':
      return { ...state, isBeautifying: true, showResults: false };
    case 'FINISH_BEAUTIFYING':
      return { ...state, isBeautifying: false, results: action.payload, showResults: true };
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
