import type { AudioFormat, VideoInfo, VideoResult } from '@/types/video';

export type ExtractAudioState = {
  videos: VideoInfo[];
  targetFormat: AudioFormat;
  bitrateKbps: number;
  outputDir: string | null;
  isExtracting: boolean;
  results: VideoResult[];
  showResults: boolean;
};

export type ExtractAudioAction =
  | { type: 'SET_VIDEOS'; payload: VideoInfo[] }
  | { type: 'SET_TARGET_FORMAT'; payload: AudioFormat }
  | { type: 'SET_BITRATE'; payload: number }
  | { type: 'SET_OUTPUT_DIR'; payload: string | null }
  | { type: 'START_EXTRACTING' }
  | { type: 'FINISH_EXTRACTING'; payload: VideoResult[] };

export const initialState: ExtractAudioState = {
  videos: [],
  targetFormat: 'mp3',
  bitrateKbps: 192,
  outputDir: null,
  isExtracting: false,
  results: [],
  showResults: false,
};

export const extractAudioReducer = (
  state: ExtractAudioState,
  action: ExtractAudioAction
): ExtractAudioState => {
  switch (action.type) {
    case 'SET_VIDEOS':
      return { ...state, videos: action.payload };
    case 'SET_TARGET_FORMAT':
      return { ...state, targetFormat: action.payload };
    case 'SET_BITRATE':
      return { ...state, bitrateKbps: action.payload };
    case 'SET_OUTPUT_DIR':
      return { ...state, outputDir: action.payload };
    case 'START_EXTRACTING':
      return { ...state, isExtracting: true, showResults: false };
    case 'FINISH_EXTRACTING':
      return { ...state, isExtracting: false, results: action.payload, showResults: true };
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
