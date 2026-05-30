import { invoke } from '@tauri-apps/api/core';
import { resolveOutputDir } from '@/lib/utils';
import { createProcessToast } from '@/lib/process-toast';
import { humanizeFfmpegError, isCancelledError } from '@/lib/ffmpeg-errors';
import type { OperationHistoryItem } from '@/types/image';
import {
  videoFormatLabels,
  type VideoConvertOptions,
  type VideoInfo,
  type VideoResult,
} from '@/types/video';
import type { VideoConvertFormValues } from './schema';

type RunArgs = {
  videos: VideoInfo[];
  values: VideoConvertFormValues;
  onStart: () => void;
  onFinish: (results: VideoResult[]) => void;
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

export const runVideoConvert = async ({
  videos,
  values,
  onStart,
  onFinish,
  onOperationComplete,
}: RunArgs) => {
  if (videos.length === 0) return;

  const { targetFormat, mode, crf, outputDir } = values;
  onStart();
  const processToast = createProcessToast({
    progressLabel: 'Converting',
    doneLabel: 'Conversion',
    itemCount: videos.length,
    itemName: 'video',
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
    const cancelledCount = results.filter((r) => isCancelledError(r.error)).length;
    const failCount = results.length - successCount - cancelledCount;

    if (cancelledCount > 0) {
      processToast.cancelled(successCount);
    } else {
      processToast.finish({
        successCount,
        failCount,
        extraInfo: `to ${videoFormatLabels[targetFormat]}${remux ? ' (remux)' : ''}`,
      });
    }

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
    onFinish([]);
    if (isCancelledError(error)) {
      processToast.cancelled(0);
      return;
    }
    const friendly = humanizeFfmpegError(error);
    processToast.error({ title: friendly.title, description: friendly.details });
  }
};
