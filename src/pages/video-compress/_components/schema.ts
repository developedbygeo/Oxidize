import type {
  VideoFormat,
  VideoInfo,
  VideoQualityMode,
  VideoResult,
} from '@/types/video';

export const videoOutputFormats: VideoFormat[] = ['mp4', 'webm', 'mkv', 'mov'];

export type VideoEncodingPreset =
  | 'ultrafast'
  | 'superfast'
  | 'veryfast'
  | 'faster'
  | 'fast'
  | 'medium'
  | 'slow'
  | 'slower'
  | 'veryslow';

export const presetOrder: VideoEncodingPreset[] = [
  'ultrafast',
  'superfast',
  'veryfast',
  'faster',
  'fast',
  'medium',
  'slow',
  'slower',
  'veryslow',
];

export const presetLabels: Record<VideoEncodingPreset, string> = {
  ultrafast: 'Ultrafast',
  superfast: 'Superfast',
  veryfast: 'Very fast',
  faster: 'Faster',
  fast: 'Fast',
  medium: 'Medium',
  slow: 'Slow',
  slower: 'Slower',
  veryslow: 'Very slow',
};

export type VideoCompressState = {
  videos: VideoInfo[];
  targetFormat: VideoFormat;
  mode: VideoQualityMode;
  crf: number;
  bitrateKbps: number;
  preset: VideoEncodingPreset;
  outputDir: string | null;
  isCompressing: boolean;
  results: VideoResult[];
  showResults: boolean;
};

export type VideoCompressAction =
  | { type: 'SET_VIDEOS'; payload: VideoInfo[] }
  | { type: 'SET_TARGET_FORMAT'; payload: VideoFormat }
  | { type: 'SET_MODE'; payload: VideoQualityMode }
  | { type: 'SET_CRF'; payload: number }
  | { type: 'SET_BITRATE'; payload: number }
  | { type: 'SET_PRESET'; payload: VideoEncodingPreset }
  | { type: 'SET_OUTPUT_DIR'; payload: string | null }
  | { type: 'START_COMPRESSING' }
  | { type: 'FINISH_COMPRESSING'; payload: VideoResult[] };

export const initialState: VideoCompressState = {
  videos: [],
  targetFormat: 'mp4',
  mode: 'crf',
  crf: 23,
  bitrateKbps: 2000,
  preset: 'medium',
  outputDir: null,
  isCompressing: false,
  results: [],
  showResults: false,
};

export const videoCompressReducer = (
  state: VideoCompressState,
  action: VideoCompressAction
): VideoCompressState => {
  switch (action.type) {
    case 'SET_VIDEOS':
      return { ...state, videos: action.payload };
    case 'SET_TARGET_FORMAT':
      return { ...state, targetFormat: action.payload };
    case 'SET_MODE':
      return { ...state, mode: action.payload };
    case 'SET_CRF':
      return { ...state, crf: action.payload };
    case 'SET_BITRATE':
      return { ...state, bitrateKbps: action.payload };
    case 'SET_PRESET':
      return { ...state, preset: action.payload };
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

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
