import type { VideoFormat, VideoInfo, VideoResult } from '@/types/video';
import type { ConvertMode } from './ModePicker';

export const videoOutputFormats: VideoFormat[] = ['mp4', 'webm', 'mkv', 'mov'];

export type VideoConvertState = {
  videos: VideoInfo[];
  targetFormat: VideoFormat;
  mode: ConvertMode;
  crf: number;
  outputDir: string | null;
  isConverting: boolean;
  results: VideoResult[];
  showResults: boolean;
};

export type VideoConvertAction =
  | { type: 'SET_VIDEOS'; payload: VideoInfo[] }
  | { type: 'SET_TARGET_FORMAT'; payload: VideoFormat }
  | { type: 'SET_MODE'; payload: ConvertMode }
  | { type: 'SET_CRF'; payload: number }
  | { type: 'SET_OUTPUT_DIR'; payload: string | null }
  | { type: 'START_CONVERTING' }
  | { type: 'FINISH_CONVERTING'; payload: VideoResult[] };

export const initialState: VideoConvertState = {
  videos: [],
  targetFormat: 'mp4',
  mode: 'reencode',
  crf: 23,
  outputDir: null,
  isConverting: false,
  results: [],
  showResults: false,
};

export const videoConvertReducer = (
  state: VideoConvertState,
  action: VideoConvertAction
): VideoConvertState => {
  switch (action.type) {
    case 'SET_VIDEOS':
      return { ...state, videos: action.payload };
    case 'SET_TARGET_FORMAT':
      return { ...state, targetFormat: action.payload };
    case 'SET_MODE':
      return { ...state, mode: action.payload };
    case 'SET_CRF':
      return { ...state, crf: action.payload };
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
