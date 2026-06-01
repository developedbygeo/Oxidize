import { invoke } from '@tauri-apps/api/core';
import { resolveOutputDir } from '@/lib/utils';
import { createProcessToast } from '@/lib/process-toast';
import { humanizeFfmpegError, isCancelledError } from '@/lib/ffmpeg-errors';
import type { OperationHistoryItem } from '@/types/image';
import type { VideoInfo, VideoResult, VideoWatermarkOptions } from '@/types/video';
import { isNoop, type VideoWatermarkFormValues } from './schema';

type RunArgs = {
  videos: VideoInfo[];
  values: VideoWatermarkFormValues;
  onStart: () => void;
  onFinish: (results: VideoResult[]) => void;
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

const POSITION_LABELS: Record<VideoWatermarkFormValues['position'], string> = {
  'top-left': 'top-left',
  'top-center': 'top-center',
  'top-right': 'top-right',
  'middle-left': 'middle-left',
  'middle-center': 'centre',
  'middle-right': 'middle-right',
  'bottom-left': 'bottom-left',
  'bottom-center': 'bottom-center',
  'bottom-right': 'bottom-right',
};

const summarize = (values: VideoWatermarkFormValues): string =>
  `Watermark ${POSITION_LABELS[values.position]} · ${values.scalePercent}% · ${values.opacity}% opacity`;

export const runVideoWatermark = async ({
  videos,
  values,
  onStart,
  onFinish,
  onOperationComplete,
}: RunArgs) => {
  if (videos.length === 0) return;
  if (isNoop(values) || !values.watermarkPath) return;

  onStart();
  const processToast = createProcessToast({
    progressLabel: 'Watermarking',
    doneLabel: 'Watermark',
    itemCount: videos.length,
    itemName: 'video',
  });

  try {
    const options: VideoWatermarkOptions = {
      format: values.targetFormat,
      watermark_path: values.watermarkPath,
      position: values.position,
      opacity: values.opacity / 100,
      scale_percent: values.scalePercent,
      margin_percent: values.marginPercent,
      crf: values.crf,
      output_dir: values.outputDir,
    };
    const results = await invoke<VideoResult[]>('watermark_videos_batch', {
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
      processToast.finish({ successCount, failCount });
    }

    if (successCount > 0 && onOperationComplete) {
      const dir = resolveOutputDir({
        results: results.filter((r) => r.success),
        fallbackDir: values.outputDir,
        fallbackPath: videos[0]?.path,
      });

      onOperationComplete({
        type: 'video-watermark',
        fileCount: successCount,
        outputDir: dir,
        details: summarize(values),
      });
    }
  } catch (error) {
    console.error('Video watermark failed:', error);
    onFinish([]);
    if (isCancelledError(error)) {
      processToast.cancelled(0);
      return;
    }
    const friendly = humanizeFfmpegError(error);
    processToast.error({ title: friendly.title, description: friendly.details });
  }
};
