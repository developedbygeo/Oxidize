import { invoke } from '@tauri-apps/api/core';
import { resolveOutputDir } from '@/lib/utils';
import { createProcessToast } from '@/lib/process-toast';
import { isCancelledError } from '@/lib/ffmpeg-errors';
import { formatLabels, type ConversionResult, type ImageInfo, type OperationHistoryItem } from '@/types/image';
import type { ConvertFormValues } from './schema';

type RunConversionArgs = {
  images: ImageInfo[];
  values: ConvertFormValues;
  onStart: () => void;
  onFinish: (results: ConversionResult[]) => void;
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

export const runConversion = async ({
  images,
  values,
  onStart,
  onFinish,
  onOperationComplete,
}: RunConversionArgs) => {
  if (images.length === 0) return;

  const { targetFormat, quality, outputDir } = values;
  onStart();
  const processToast = createProcessToast({
    progressLabel: 'Converting',
    doneLabel: 'Conversion',
    itemCount: images.length,
  });

  try {
    const results = await invoke<ConversionResult[]>('convert_images_batch', {
      inputPaths: images.map((img) => img.path),
      options: { format: targetFormat, quality, output_dir: outputDir },
    });
    onFinish(results);

    const successCount = results.filter((r) => r.success).length;
    const cancelledCount = results.filter((r) => isCancelledError(r.error)).length;
    const failCount = results.length - successCount - cancelledCount;
    const totalSaved = results.reduce((acc, r) => acc + (r.original_size - r.new_size), 0);

    if (cancelledCount > 0) {
      processToast.cancelled(successCount);
    } else {
      processToast.finish({
        successCount,
        failCount,
        extraInfo: `converted to ${formatLabels[targetFormat]}`,
      });
    }

    if (successCount > 0 && onOperationComplete) {
      const dir = resolveOutputDir({
        results: results.filter((r) => r.success),
        fallbackDir: outputDir,
        fallbackPath: images[0]?.path,
      });

      onOperationComplete({
        type: 'convert',
        fileCount: successCount,
        outputDir: dir,
        details: `Converted to ${formatLabels[targetFormat]}`,
        totalSaved: totalSaved > 0 ? totalSaved : undefined,
      });
    }
  } catch (error) {
    console.error('Conversion failed:', error);
    processToast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    onFinish([]);
  }
};
