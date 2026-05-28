import { invoke } from '@tauri-apps/api/core';
import { resolveOutputDir } from '@/lib/utils';
import { createProcessToast } from '@/lib/process-toast';
import type { OperationHistoryItem } from '@/types/image';
import type { VideoInfo, VideoResizeOptions, VideoResult } from '@/types/video';
import type { VideoResizeFormValues } from './schema';

type RunArgs = {
  videos: VideoInfo[];
  values: VideoResizeFormValues;
  onStart: () => void;
  onFinish: (results: VideoResult[]) => void;
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

const buildSizeDetails = (values: VideoResizeFormValues): string => {
  if (values.mode === 'presetheight') return `${values.presetHeight}p`;
  if (values.maintainAspect) return `${values.customWidth || '?'} × auto`;
  return `${values.customWidth}×${values.customHeight}`;
};

export const runVideoResize = async ({
  videos,
  values,
  onStart,
  onFinish,
  onOperationComplete,
}: RunArgs) => {
  if (videos.length === 0) return;

  onStart();
  const processToast = createProcessToast({
    progressLabel: 'Resizing',
    doneLabel: 'Resize',
    itemCount: videos.length,
    itemName: 'video',
  });

  try {
    const options: VideoResizeOptions = {
      format: values.targetFormat,
      mode: values.mode,
      target_height: values.mode === 'presetheight' ? values.presetHeight : null,
      width: values.mode === 'custom' ? values.customWidth : null,
      height: values.mode === 'custom' ? values.customHeight : null,
      maintain_aspect: values.mode === 'custom' ? values.maintainAspect : null,
      crf: values.crf,
      output_dir: values.outputDir,
    };
    const results = await invoke<VideoResult[]>('resize_videos_batch', {
      inputPaths: videos.map((v) => v.path),
      options,
    });
    onFinish(results);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;
    const sizeDetails = buildSizeDetails(values);

    processToast.finish({
      successCount,
      failCount,
      extraInfo: `→ ${sizeDetails}`,
    });

    if (successCount > 0 && onOperationComplete) {
      const dir = resolveOutputDir({
        results: results.filter((r) => r.success),
        fallbackDir: values.outputDir,
        fallbackPath: videos[0]?.path,
      });

      onOperationComplete({
        type: 'video-resize',
        fileCount: successCount,
        outputDir: dir,
        details: `Resized to ${sizeDetails}`,
      });
    }
  } catch (error) {
    console.error('Video resize failed:', error);
    processToast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    onFinish([]);
  }
};
