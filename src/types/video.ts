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

export type VideoResizeMode = 'presetheight' | 'custom';

export interface VideoResizeOptions {
  format: VideoFormat;
  mode: VideoResizeMode;
  target_height: number | null;
  width: number | null;
  height: number | null;
  maintain_aspect: boolean | null;
  crf: number | null;
  output_dir: string | null;
}

export interface VideoWatermarkOptions {
  format: VideoFormat;
  watermark_path: string;
  position: import('./image').WatermarkPosition;
  /** Alpha multiplier, 0.0..=1.0. */
  opacity: number;
  /** Watermark width as a percentage of the source video width. */
  scale_percent: number;
  /** Edge inset as a percentage of source video width. */
  margin_percent: number;
  crf: number | null;
  output_dir: string | null;
}

export type VideoOperationType =
  | 'video-convert'
  | 'video-compress'
  | 'video-resize'
  | 'video-trim'
  | 'extract-audio'
  | 'video-watermark';

export type VideoTrimMode = 'accurate' | 'fast';

export interface VideoTrimOptions {
  mode: VideoTrimMode;
  start_seconds: number;
  end_seconds: number;
  crf: number | null;
  output_dir: string | null;
}

// ---- Audio extraction ----

export type AudioFormat = 'mp3' | 'aac' | 'opus' | 'flac' | 'wav';

export const audioFormatLabels: Record<AudioFormat, string> = {
  mp3: 'MP3',
  aac: 'AAC',
  opus: 'Opus',
  flac: 'FLAC',
  wav: 'WAV',
};

export const audioFormatDescriptions: Record<AudioFormat, string> = {
  mp3: 'Universal, broad compatibility',
  aac: 'Better quality than MP3 at same bitrate',
  opus: 'Best modern lossy codec',
  flac: 'Lossless · large files',
  wav: 'Uncompressed · largest files',
};

export const isLosslessAudioFormat = (format: AudioFormat): boolean =>
  format === 'flac' || format === 'wav';

export const audioBitrateOptions = [96, 128, 192, 256, 320] as const;

export interface AudioExtractOptions {
  format: AudioFormat;
  bitrate_kbps: number | null;
  output_dir: string | null;
}

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
