import { invoke } from '@tauri-apps/api/core';
import { resolveOutputDir } from '@/lib/utils';
import { createProcessToast } from '@/lib/process-toast';
import { isCancelledError, isSkippedError } from '@/lib/ffmpeg-errors';
import { toOutputNaming } from '@/types/output-naming';
import type { CropOptions, CropResult, ImageInfo, OperationHistoryItem } from '@/types/image';
import type { CropFormValues } from './schema';

type RunArgs = {
  images: ImageInfo[];
  values: CropFormValues;
  onStart: () => void;
  onFinish: (results: CropResult[]) => void;
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

export const runCrop = async ({
  images,
  values,
  onStart,
  onFinish,
  onOperationComplete,
}: RunArgs) => {
  if (images.length === 0) return;
  if (values.width <= 0 || values.height <= 0) return;

  onStart();
  const processToast = createProcessToast({
    progressLabel: 'Cropping',
    doneLabel: 'Crop',
    itemCount: images.length,
  });

  try {
    const options: CropOptions = {
      x: Math.round(values.x),
      y: Math.round(values.y),
      width: Math.round(values.width),
      height: Math.round(values.height),
      output_dir: values.outputDir,
      naming: toOutputNaming(values.filenameTemplate, values.overwriteMode),
    };
    const results = await invoke<CropResult[]>('crop_images_batch', {
      inputPaths: images.map((img) => img.path),
      options,
    });
    onFinish(results);

    const successCount = results.filter((r) => r.success).length;
    const cancelledCount = results.filter((r) => isCancelledError(r.error)).length;
    const skippedCount = results.filter((r) => isSkippedError(r.error)).length;
    const failCount = results.length - successCount - cancelledCount - skippedCount;
    if (cancelledCount > 0) {
      processToast.cancelled(successCount);
    } else if (skippedCount > 0 && failCount === 0) {
      processToast.skipped({ successCount, skipCount: skippedCount });
    } else {
      processToast.finish({ successCount, failCount });
    }

    if (successCount > 0 && onOperationComplete) {
      const dir = resolveOutputDir({
        results: results.filter((r) => r.success),
        fallbackDir: values.outputDir,
        fallbackPath: images[0]?.path,
      });

      onOperationComplete({
        type: 'crop',
        fileCount: successCount,
        outputDir: dir,
        details: `Cropped to ${options.width}×${options.height}`,
      });
    }
  } catch (error) {
    console.error('Crop failed:', error);
    processToast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    onFinish([]);
  }
};
