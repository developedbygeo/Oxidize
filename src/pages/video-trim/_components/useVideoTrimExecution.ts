import { invoke } from '@tauri-apps/api/core';
import { resolveOutputDir } from '@/lib/utils';
import { createProcessToast } from '@/lib/process-toast';
import { formatVideoDuration } from '@/types/video';
import type { OperationHistoryItem } from '@/types/image';
import type { VideoInfo, VideoResult, VideoTrimOptions } from '@/types/video';
import type { TrimSpec, VideoTrimFormValues } from './schema';

type RunArgs = {
  videos: VideoInfo[];
  trims: Record<string, TrimSpec>;
  values: VideoTrimFormValues;
  onStart: () => void;
  onFinish: (results: VideoResult[]) => void;
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

export const runVideoTrim = async ({
  videos,
  trims,
  values,
  onStart,
  onFinish,
  onOperationComplete,
}: RunArgs) => {
  if (videos.length === 0) return;

  const { mode, crf, outputDir } = values;
  onStart();
  const processToast = createProcessToast({
    progressLabel: 'Trimming',
    doneLabel: 'Trim',
    itemCount: videos.length,
    itemName: 'video',
  });

  const accurate = mode === 'accurate';
  const results: VideoResult[] = [];

  try {
    for (const video of videos) {
      const trim = trims[video.path];
      if (!trim || trim.end <= trim.start) {
        results.push({
          success: false,
          input_path: video.path,
          output_path: null,
          error: 'Invalid trim range',
          original_size: video.size,
          new_size: 0,
        });
        continue;
      }
      const options: VideoTrimOptions = {
        mode,
        start_seconds: trim.start,
        end_seconds: trim.end,
        crf: accurate ? crf : null,
        output_dir: outputDir,
      };
      try {
        const r = await invoke<VideoResult>('trim_video', {
          inputPath: video.path,
          options,
        });
        results.push(r);
      } catch (e) {
        results.push({
          success: false,
          input_path: video.path,
          output_path: null,
          error: e instanceof Error ? e.message : String(e),
          original_size: video.size,
          new_size: 0,
        });
      }
    }

    onFinish(results);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;
    const firstTrim = trims[videos[0].path];
    const sample = firstTrim
      ? `${formatVideoDuration(firstTrim.start)}–${formatVideoDuration(firstTrim.end)}`
      : '';

    processToast.finish({
      successCount,
      failCount,
      extraInfo: accurate ? `accurate · ${sample}` : `fast · ${sample}`,
    });

    if (successCount > 0 && onOperationComplete) {
      const dir = resolveOutputDir({
        results: results.filter((r) => r.success),
        fallbackDir: outputDir,
        fallbackPath: videos[0]?.path,
      });

      onOperationComplete({
        type: 'video-trim',
        fileCount: successCount,
        outputDir: dir,
        details: accurate ? `Accurate trim · CRF ${crf}` : 'Fast trim (stream-copy)',
      });
    }
  } catch (error) {
    console.error('Video trim failed:', error);
    processToast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    onFinish(results);
  }
};
