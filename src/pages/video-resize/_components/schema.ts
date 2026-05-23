import type {
  VideoFormat,
  VideoInfo,
  VideoResizeMode,
  VideoResult,
} from '@/types/video';

export const videoOutputFormats: VideoFormat[] = ['mp4', 'webm', 'mkv', 'mov'];

export type ResolutionPreset = {
  height: number;
  label: string;
  description: string;
};

export const resolutionPresets: ResolutionPreset[] = [
  { height: 2160, label: '4K', description: '2160p · 3840×2160 source' },
  { height: 1440, label: '1440p', description: '2K · QHD' },
  { height: 1080, label: '1080p', description: 'Full HD · most common' },
  { height: 720, label: '720p', description: 'HD · smaller files' },
  { height: 480, label: '480p', description: 'SD · web/preview' },
  { height: 360, label: '360p', description: 'Tiny · thumbnails / messaging' },
];

export type VideoResizeState = {
  videos: VideoInfo[];
  targetFormat: VideoFormat;
  mode: VideoResizeMode;
  presetHeight: number;
  customWidth: number;
  customHeight: number;
  maintainAspect: boolean;
  crf: number;
  outputDir: string | null;
  isResizing: boolean;
  results: VideoResult[];
  showResults: boolean;
};

export type VideoResizeAction =
  | { type: 'SET_VIDEOS'; payload: VideoInfo[] }
  | { type: 'SET_TARGET_FORMAT'; payload: VideoFormat }
  | { type: 'SET_MODE'; payload: VideoResizeMode }
  | { type: 'SET_PRESET_HEIGHT'; payload: number }
  | { type: 'SET_CUSTOM_WIDTH'; payload: number }
  | { type: 'SET_CUSTOM_HEIGHT'; payload: number }
  | { type: 'SET_MAINTAIN_ASPECT'; payload: boolean }
  | { type: 'SET_CRF'; payload: number }
  | { type: 'SET_OUTPUT_DIR'; payload: string | null }
  | { type: 'START_RESIZING' }
  | { type: 'FINISH_RESIZING'; payload: VideoResult[] };

export const initialState: VideoResizeState = {
  videos: [],
  targetFormat: 'mp4',
  mode: 'presetheight',
  presetHeight: 1080,
  customWidth: 1280,
  customHeight: 720,
  maintainAspect: true,
  crf: 23,
  outputDir: null,
  isResizing: false,
  results: [],
  showResults: false,
};

export const videoResizeReducer = (
  state: VideoResizeState,
  action: VideoResizeAction
): VideoResizeState => {
  switch (action.type) {
    case 'SET_VIDEOS':
      return { ...state, videos: action.payload };
    case 'SET_TARGET_FORMAT':
      return { ...state, targetFormat: action.payload };
    case 'SET_MODE':
      return { ...state, mode: action.payload };
    case 'SET_PRESET_HEIGHT':
      return { ...state, presetHeight: action.payload };
    case 'SET_CUSTOM_WIDTH':
      return { ...state, customWidth: action.payload };
    case 'SET_CUSTOM_HEIGHT':
      return { ...state, customHeight: action.payload };
    case 'SET_MAINTAIN_ASPECT':
      return { ...state, maintainAspect: action.payload };
    case 'SET_CRF':
      return { ...state, crf: action.payload };
    case 'SET_OUTPUT_DIR':
      return { ...state, outputDir: action.payload };
    case 'START_RESIZING':
      return { ...state, isResizing: true, showResults: false };
    case 'FINISH_RESIZING':
      return { ...state, isResizing: false, results: action.payload, showResults: true };
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
