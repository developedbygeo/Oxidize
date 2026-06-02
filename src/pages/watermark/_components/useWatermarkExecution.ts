import { invoke } from '@tauri-apps/api/core';
import { resolveOutputDir } from '@/lib/utils';
import { createProcessToast } from '@/lib/process-toast';
import { isCancelledError, isSkippedError } from '@/lib/ffmpeg-errors';
import { firstImageError, humanizeImageError } from '@/lib/image-errors';
import { toOutputNaming } from '@/types/output-naming';
import type {
  ImageInfo,
  OperationHistoryItem,
  WatermarkOptions,
  WatermarkResult,
} from '@/types/image';
import { isNoop, type WatermarkFormValues } from './schema';

type RunArgs = {
  images: ImageInfo[];
  values: WatermarkFormValues;
  onStart: () => void;
  onFinish: (results: WatermarkResult[]) => void;
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

const POSITION_LABELS: Record<WatermarkFormValues['position'], string> = {
  'top-left': 'top-left',
  'top-center': 'top-center',
  'top-right': 'top-right',
  'middle-left': 'middle-left',
  'middle-center': 'centre',
  'middle-right': 'middle-right',
  'bottom-left': 'bottom-left',
  'bottom-center': 'bottom-center',
  'bottom-right': 'bottom-right',
};

const summarize = (values: WatermarkFormValues): string =>
  `Watermark ${POSITION_LABELS[values.position]} · ${values.scalePercent}% · ${values.opacity}% opacity`;

export const runWatermark = async ({
  images,
  values,
  onStart,
  onFinish,
  onOperationComplete,
}: RunArgs) => {
  if (images.length === 0) return;
  // Defensive — the page disables the button, but a paste + immediate
  // Ctrl+Enter could squeak through before the watermark is picked.
  if (isNoop(values) || !values.watermarkPath) return;

  onStart();
  const processToast = createProcessToast({
    progressLabel: 'Watermarking',
    doneLabel: 'Watermark',
    itemCount: images.length,
  });

  try {
    const options: WatermarkOptions = {
      watermark_path: values.watermarkPath,
      position: values.position,
      opacity: values.opacity / 100,
      scale_percent: values.scalePercent,
      margin_percent: values.marginPercent,
      output_dir: values.outputDir,
      naming: toOutputNaming(values.filenameTemplate, values.overwriteMode),
    };
    const results = await invoke<WatermarkResult[]>('watermark_images_batch', {
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
        type: 'watermark',
        fileCount: successCount,
        outputDir: dir,
        details: summarize(values),
      });
    }
  } catch (error) {
    console.error('Watermark failed:', error);
    const friendly = humanizeImageError(error);
    processToast.error({ title: friendly.title, description: friendly.details });
    onFinish([]);
  }
};
