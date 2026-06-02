import { invoke } from '@tauri-apps/api/core';
import { resolveOutputDir } from '@/lib/utils';
import { createProcessToast } from '@/lib/process-toast';
import { humanizeFfmpegError, isCancelledError } from '@/lib/ffmpeg-errors';
import type { OperationHistoryItem } from '@/types/image';
import {
  audioFormatLabels,
  isLosslessAudioFormat,
  type AudioExtractOptions,
  type VideoInfo,
  type VideoResult,
} from '@/types/video';
import type { ExtractAudioFormValues } from './schema';

type RunArgs = {
  videos: VideoInfo[];
  values: ExtractAudioFormValues;
  onStart: () => void;
  onFinish: (results: VideoResult[]) => void;
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

export const runExtractAudio = async ({
  videos,
  values,
  onStart,
  onFinish,
  onOperationComplete,
}: RunArgs) => {
  if (videos.length === 0) return;

  const { targetFormat, bitrateKbps, outputDir } = values;
  onStart();
  const processToast = createProcessToast({
    progressLabel: 'Extracting audio from',
    doneLabel: 'Audio extraction',
    itemCount: videos.length,
    itemName: 'video',
  });

  try {
    const lossless = isLosslessAudioFormat(targetFormat);
    const options: AudioExtractOptions = {
      format: targetFormat,
      bitrate_kbps: lossless ? null : bitrateKbps,
      output_dir: outputDir,
    };
    const results = await invoke<VideoResult[]>('extract_audio_batch', {
      inputPaths: videos.map((v) => v.path),
      options,
    });
    onFinish(results);

    const successCount = results.filter((r) => r.success).length;
    const cancelledCount = results.filter((r) => isCancelledError(r.error)).length;
    const failCount = results.length - successCount - cancelledCount;
    const formatLabel = audioFormatLabels[targetFormat];

    if (cancelledCount > 0) {
      processToast.cancelled(successCount);
    } else {
      processToast.finish({
        successCount,
        failCount,
        extraInfo: lossless ? `→ ${formatLabel}` : `→ ${formatLabel} @ ${bitrateKbps} kbps`,
      });
    }

    if (successCount > 0 && onOperationComplete) {
      const dir = resolveOutputDir({
        results: results.filter((r) => r.success),
        fallbackDir: outputDir,
        fallbackPath: videos[0]?.path,
      });

      onOperationComplete({
        type: 'extract-audio',
        fileCount: successCount,
        outputDir: dir,
        details: lossless
          ? `Extracted ${formatLabel}`
          : `Extracted ${formatLabel} @ ${bitrateKbps} kbps`,
      });
    }
  } catch (error) {
    console.error('Audio extraction failed:', error);
    onFinish([]);
    if (isCancelledError(error)) {
      processToast.cancelled(0);
      return;
    }
    const friendly = humanizeFfmpegError(error);
    processToast.error({ title: friendly.title, description: friendly.details });
  }
};
