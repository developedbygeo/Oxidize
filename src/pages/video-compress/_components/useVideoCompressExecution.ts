import { invoke } from '@tauri-apps/api/core';
import { resolveOutputDir } from '@/lib/utils';
import { createProcessToast } from '@/lib/process-toast';
import type { OperationHistoryItem } from '@/types/image';
import type { VideoCompressOptions, VideoInfo, VideoResult } from '@/types/video';
import type { VideoCompressFormValues } from './schema';

type RunArgs = {
  videos: VideoInfo[];
  values: VideoCompressFormValues;
  onStart: () => void;
  onFinish: (results: VideoResult[]) => void;
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

export const runVideoCompress = async ({
  videos,
  values,
  onStart,
  onFinish,
  onOperationComplete,
}: RunArgs) => {
  if (videos.length === 0) return;

  const { targetFormat, mode, crf, bitrateKbps, preset, outputDir } = values;
  onStart();
  const processToast = createProcessToast({
    progressLabel: 'Compressing',
    doneLabel: 'Compression',
    itemCount: videos.length,
    itemName: 'video',
  });

  try {
    const options: VideoCompressOptions = {
      format: targetFormat,
      mode,
      crf: mode === 'crf' ? crf : null,
      bitrate_kbps: mode === 'bitrate' ? bitrateKbps : null,
      preset,
      output_dir: outputDir,
    };
    const results = await invoke<VideoResult[]>('compress_videos_batch', {
      inputPaths: videos.map((v) => v.path),
      options,
    });
    onFinish(results);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;
    const totalSaved = results.reduce(
      (acc, r) => acc + Math.max(0, r.original_size - r.new_size),
      0
    );

    processToast.finish({
      successCount,
      failCount,
      extraInfo: mode === 'crf' ? `CRF ${crf}` : `${bitrateKbps} kbps`,
    });

    if (successCount > 0 && onOperationComplete) {
      const dir = resolveOutputDir({
        results: results.filter((r) => r.success),
        fallbackDir: outputDir,
        fallbackPath: videos[0]?.path,
      });

      onOperationComplete({
        type: 'video-compress',
        fileCount: successCount,
        outputDir: dir,
        details: mode === 'crf' ? `CRF ${crf}` : `${bitrateKbps} kbps target`,
        totalSaved: totalSaved > 0 ? totalSaved : undefined,
      });
    }
  } catch (error) {
    console.error('Video compression failed:', error);
    processToast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    onFinish([]);
  }
};
