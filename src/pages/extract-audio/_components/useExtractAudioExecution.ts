import { invoke } from '@tauri-apps/api/core';
import { resolveOutputDir } from '@/lib/utils';
import { createProcessToast } from '@/lib/process-toast';
import type { OperationHistoryItem } from '@/types/image';
import {
  audioFormatLabels,
  isLosslessAudioFormat,
  type AudioExtractOptions,
  type AudioFormat,
  type VideoInfo,
  type VideoResult,
} from '@/types/video';

type RunArgs = {
  videos: VideoInfo[];
  targetFormat: AudioFormat;
  bitrateKbps: number;
  outputDir: string | null;
  onStart: () => void;
  onFinish: (results: VideoResult[]) => void;
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

export const runExtractAudio = async (args: RunArgs) => {
  if (args.videos.length === 0) return;

  args.onStart();
  const processToast = createProcessToast({
    progressLabel: 'Extracting audio from',
    doneLabel: 'Audio extraction',
    itemCount: args.videos.length,
    itemName: 'video',
  });

  try {
    const lossless = isLosslessAudioFormat(args.targetFormat);
    const options: AudioExtractOptions = {
      format: args.targetFormat,
      bitrate_kbps: lossless ? null : args.bitrateKbps,
      output_dir: args.outputDir,
    };
    const results = await invoke<VideoResult[]>('extract_audio_batch', {
      inputPaths: args.videos.map((v) => v.path),
      options,
    });
    args.onFinish(results);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;
    const formatLabel = audioFormatLabels[args.targetFormat];

    processToast.finish({
      successCount,
      failCount,
      extraInfo: lossless ? `→ ${formatLabel}` : `→ ${formatLabel} @ ${args.bitrateKbps} kbps`,
    });

    if (successCount > 0 && args.onOperationComplete) {
      const dir = resolveOutputDir({
        results: results.filter((r) => r.success),
        fallbackDir: args.outputDir,
        fallbackPath: args.videos[0]?.path,
      });

      args.onOperationComplete({
        type: 'extract-audio',
        fileCount: successCount,
        outputDir: dir,
        details: lossless
          ? `Extracted ${formatLabel}`
          : `Extracted ${formatLabel} @ ${args.bitrateKbps} kbps`,
      });
    }
  } catch (error) {
    console.error('Audio extraction failed:', error);
    processToast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    args.onFinish([]);
  }
};
