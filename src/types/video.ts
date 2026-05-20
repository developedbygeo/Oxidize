export interface VideoInfo {
  path: string;
  name: string;
  size: number;
  width: number;
  height: number;
  duration_seconds: number;
  format: string;
  video_codec: string;
  audio_codec: string | null;
  bitrate: number | null;
  thumbnail: string | null;
}

export interface VideoResult {
  success: boolean;
  input_path: string;
  output_path: string | null;
  error: string | null;
  original_size: number;
  new_size: number;
}

export type VideoFormat = 'mp4' | 'webm' | 'mkv' | 'mov' | 'avi';

export const videoFormatLabels: Record<VideoFormat, string> = {
  mp4: 'MP4',
  webm: 'WebM',
  mkv: 'MKV',
  mov: 'MOV',
  avi: 'AVI',
};

export const videoFormatDescriptions: Record<VideoFormat, string> = {
  mp4: 'Universal, great compatibility',
  webm: 'Modern, open, web-friendly',
  mkv: 'Lossless container, very flexible',
  mov: 'Apple-friendly, ProRes-capable',
  avi: 'Older container, broad support',
};

export interface VideoConvertOptions {
  format: VideoFormat;
  video_codec: string | null;
  audio_codec: string | null;
  crf: number | null;
  output_dir: string | null;
}

export type VideoQualityMode = 'crf' | 'bitrate';

export interface VideoCompressOptions {
  format: VideoFormat;
  mode: VideoQualityMode;
  crf: number | null;
  bitrate_kbps: number | null;
  preset: string | null;
  output_dir: string | null;
}

export type VideoOperationType = 'video-convert' | 'video-compress';

export interface VideoProgressPayload {
  input_path: string;
  /** Fraction 0.0..=1.0 */
  progress: number;
  out_time_seconds: number;
}

export const formatVideoDuration = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) return '–';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
};
