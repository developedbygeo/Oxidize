import { invoke } from '@tauri-apps/api/core';
import { resolveOutputDir } from '@/lib/utils';
import { createProcessToast } from '@/lib/process-toast';
import { isCancelledError, isSkippedError } from '@/lib/ffmpeg-errors';
import { firstImageError, humanizeImageError } from '@/lib/image-errors';
import { toOutputNaming } from '@/types/output-naming';
import type {
  ImageInfo,
  OperationHistoryItem,
  RotateOptions,
  RotateResult,
} from '@/types/image';
import { isNoop, type RotateFormValues } from './schema';

type RunArgs = {
  images: ImageInfo[];
  values: RotateFormValues;
  onStart: () => void;
  onFinish: (results: RotateResult[]) => void;
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

const summarize = (values: RotateFormValues): string => {
  const parts: string[] = [];
  if (values.rotationDegrees !== 0) parts.push(`Rotate ${values.rotationDegrees}°`);
  if (values.flipHorizontal) parts.push('Flip horizontal');
  if (values.flipVertical) parts.push('Flip vertical');
  return parts.join(' · ');
};

export const runRotate = async ({
  images,
  values,
  onStart,
  onFinish,
  onOperationComplete,
}: RunArgs) => {
  if (images.length === 0) return;
  // Caller (page) already disables the button in this case, but cheap
  // defence — silently no-op rather than firing an empty toast.
  if (isNoop(values)) return;

  onStart();
  const processToast = createProcessToast({
    progressLabel: 'Rotating',
    doneLabel: 'Rotate',
    itemCount: images.length,
  });

  try {
    const options: RotateOptions = {
      rotation_degrees: values.rotationDegrees,
      flip_horizontal: values.flipHorizontal,
      flip_vertical: values.flipVertical,
      output_dir: values.outputDir,
      naming: toOutputNaming(values.filenameTemplate, values.overwriteMode),
    };
    const results = await invoke<RotateResult[]>('rotate_images_batch', {
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
        type: 'rotate',
        fileCount: successCount,
        outputDir: dir,
        details: summarize(values),
      });
    }
  } catch (error) {
    console.error('Rotate failed:', error);
    const friendly = humanizeImageError(error);
    processToast.error({ title: friendly.title, description: friendly.details });
    onFinish([]);
  }
};
