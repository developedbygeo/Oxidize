import { invoke } from '@tauri-apps/api/core';
import { resolveOutputDir } from '@/lib/utils';
import { createProcessToast } from '@/lib/process-toast';
import type { OperationHistoryItem } from '@/types/image';
import type {
  VideoFormat,
  VideoInfo,
  VideoResizeMode,
  VideoResizeOptions,
  VideoResult,
} from '@/types/video';

type RunArgs = {
  videos: VideoInfo[];
  targetFormat: VideoFormat;
  mode: VideoResizeMode;
  presetHeight: number;
  customWidth: number;
  customHeight: number;
  maintainAspect: boolean;
  crf: number;
  outputDir: string | null;
  onStart: () => void;
  onFinish: (results: VideoResult[]) => void;
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

const buildSizeDetails = (args: RunArgs): string => {
  if (args.mode === 'presetheight') return `${args.presetHeight}p`;
  if (args.maintainAspect) return `${args.customWidth || '?'} × auto`;
  return `${args.customWidth}×${args.customHeight}`;
};

export const runVideoResize = async (args: RunArgs) => {
  if (args.videos.length === 0) return;

  args.onStart();
  const processToast = createProcessToast({
    progressLabel: 'Resizing',
    doneLabel: 'Resize',
    itemCount: args.videos.length,
    itemName: 'video',
  });

  try {
    const options: VideoResizeOptions = {
      format: args.targetFormat,
      mode: args.mode,
      target_height: args.mode === 'presetheight' ? args.presetHeight : null,
      width: args.mode === 'custom' ? args.customWidth : null,
      height: args.mode === 'custom' ? args.customHeight : null,
      maintain_aspect: args.mode === 'custom' ? args.maintainAspect : null,
      crf: args.crf,
      output_dir: args.outputDir,
    };
    const results = await invoke<VideoResult[]>('resize_videos_batch', {
      inputPaths: args.videos.map((v) => v.path),
      options,
    });
    args.onFinish(results);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;
    const sizeDetails = buildSizeDetails(args);

    processToast.finish({
      successCount,
      failCount,
      extraInfo: `→ ${sizeDetails}`,
    });

    if (successCount > 0 && args.onOperationComplete) {
      const dir = resolveOutputDir({
        results: results.filter((r) => r.success),
        fallbackDir: args.outputDir,
        fallbackPath: args.videos[0]?.path,
      });

      args.onOperationComplete({
        type: 'video-resize',
        fileCount: successCount,
        outputDir: dir,
        details: `Resized to ${sizeDetails}`,
      });
    }
  } catch (error) {
    console.error('Video resize failed:', error);
    processToast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    args.onFinish([]);
  }
};
