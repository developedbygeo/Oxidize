import { invoke } from '@tauri-apps/api/core';
import { resolveOutputDir } from '@/lib/utils';
import { createProcessToast } from '@/lib/process-toast';
import type { OperationHistoryItem } from '@/types/image';
import {
  videoFormatLabels,
  type VideoConvertOptions,
  type VideoFormat,
  type VideoInfo,
  type VideoResult,
} from '@/types/video';
import type { ConvertMode } from './ModePicker';

type RunArgs = {
  videos: VideoInfo[];
  targetFormat: VideoFormat;
  mode: ConvertMode;
  crf: number;
  outputDir: string | null;
  onStart: () => void;
  onFinish: (results: VideoResult[]) => void;
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

export const runVideoConvert = async ({
  videos,
  targetFormat,
  mode,
  crf,
  outputDir,
  onStart,
  onFinish,
  onOperationComplete,
}: RunArgs) => {
  if (videos.length === 0) return;

  onStart();
  const processToast = createProcessToast({
    action: 'Video conversion',
    itemCount: videos.length,
  });

  try {
    const remux = mode === 'remux';
    const options: VideoConvertOptions = {
      format: targetFormat,
      video_codec: remux ? 'copy' : null,
      audio_codec: remux ? 'copy' : null,
      crf: remux ? null : crf,
      output_dir: outputDir,
    };
    const results = await invoke<VideoResult[]>('convert_videos_batch', {
      inputPaths: videos.map((v) => v.path),
      options,
    });
    onFinish(results);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    processToast.finish({
      successCount,
      failCount,
      extraInfo: `to ${videoFormatLabels[targetFormat]}${remux ? ' (remux)' : ''}`,
    });

    if (successCount > 0 && onOperationComplete) {
      const dir = resolveOutputDir({
        results: results.filter((r) => r.success),
        fallbackDir: outputDir,
        fallbackPath: videos[0]?.path,
      });

      onOperationComplete({
        type: 'video-convert',
        fileCount: successCount,
        outputDir: dir,
        details: remux
          ? `Remuxed to ${videoFormatLabels[targetFormat]}`
          : `Re-encoded to ${videoFormatLabels[targetFormat]} (CRF ${crf})`,
      });
    }
  } catch (error) {
    console.error('Video conversion failed:', error);
    processToast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    onFinish([]);
  }
};
