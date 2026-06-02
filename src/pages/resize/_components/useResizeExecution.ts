import { invoke } from '@tauri-apps/api/core';
import { resolveOutputDir } from '@/lib/utils';
import { createProcessToast } from '@/lib/process-toast';
import { isCancelledError, isSkippedError } from '@/lib/ffmpeg-errors';
import { firstImageError, humanizeImageError } from '@/lib/image-errors';
import { toOutputNaming } from '@/types/output-naming';
import type {
  ImageInfo,
  OperationHistoryItem,
  ResizeOptions,
  ResizeResult,
} from '@/types/image';
import { isNoop, type ResizeFormValues } from './schema';

type RunArgs = {
  images: ImageInfo[];
  values: ResizeFormValues;
  onStart: () => void;
  onFinish: (results: ResizeResult[]) => void;
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

const summarize = (values: ResizeFormValues): string => {
  if (values.width !== null && values.height !== null) {
    return `Resize to ${values.width}×${values.height} (${values.fit})`;
  }
  if (values.width !== null) return `Resize width to ${values.width}px`;
  if (values.height !== null) return `Resize height to ${values.height}px`;
  return 'Resize';
};

export const runResize = async ({
  images,
  values,
  onStart,
  onFinish,
  onOperationComplete,
}: RunArgs) => {
  if (images.length === 0) return;
  // Defensive — page disables the button when this is true, but a paste +
  // immediate Ctrl+Enter could squeak through.
  if (isNoop(values)) return;

  onStart();
  const processToast = createProcessToast({
    progressLabel: 'Resizing',
    doneLabel: 'Resize',
    itemCount: images.length,
  });

  try {
    const options: ResizeOptions = {
      width: values.width,
      height: values.height,
      fit: values.fit,
      output_dir: values.outputDir,
      naming: toOutputNaming(values.filenameTemplate, values.overwriteMode),
    };
    const results = await invoke<ResizeResult[]>('resize_images_batch', {
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
      processToast.finish({
        successCount,
        failCount,
        firstError: firstImageError(results),
      });
    }

    if (successCount > 0 && onOperationComplete) {
      const dir = resolveOutputDir({
        results: results.filter((r) => r.success),
        fallbackDir: values.outputDir,
        fallbackPath: images[0]?.path,
      });

      onOperationComplete({
        type: 'resize',
        fileCount: successCount,
        outputDir: dir,
        details: summarize(values),
      });
    }
  } catch (error) {
    console.error('Resize failed:', error);
    const friendly = humanizeImageError(error);
    processToast.error({ title: friendly.title, description: friendly.details });
    onFinish([]);
  }
};
