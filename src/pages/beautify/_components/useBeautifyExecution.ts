import { invoke } from '@tauri-apps/api/core';
import { resolveOutputDir, formatAdjustmentDetails } from '@/lib/utils';
import { createProcessToast } from '@/lib/process-toast';
import type {
  BeautifyOptions,
  BeautifyResult,
  ImageInfo,
  OperationHistoryItem,
} from '@/types/image';
import type { Adjustments } from './schema';

type RunArgs = {
  images: ImageInfo[];
  adjustments: Adjustments;
  outputDir: string | null;
  onStart: () => void;
  onFinish: (results: BeautifyResult[]) => void;
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

export const runBeautify = async ({
  images,
  adjustments,
  outputDir,
  onStart,
  onFinish,
  onOperationComplete,
}: RunArgs) => {
  if (images.length === 0) return;

  onStart();
  const processToast = createProcessToast({
    progressLabel: 'Beautifying',
    doneLabel: 'Beautification',
    itemCount: images.length,
  });

  try {
    const options: BeautifyOptions = { ...adjustments, output_dir: outputDir };
    const results = await invoke<BeautifyResult[]>('beautify_images_batch', {
      inputPaths: images.map((img) => img.path),
      options,
    });
    onFinish(results);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;
    processToast.finish({ successCount, failCount });

    if (successCount > 0 && onOperationComplete) {
      const dir = resolveOutputDir({
        results: results.filter((r) => r.success),
        fallbackDir: outputDir,
        fallbackPath: images[0]?.path,
      });

      const details = formatAdjustmentDetails([
        { label: 'Brightness', value: adjustments.brightness },
        { label: 'Contrast', value: adjustments.contrast },
        { label: 'Saturation', value: adjustments.saturation },
        { label: 'WB', value: adjustments.white_balance, defaultValue: 'daylight' },
      ]);

      onOperationComplete({
        type: 'beautify',
        fileCount: successCount,
        outputDir: dir,
        details,
      });
    }
  } catch (error) {
    console.error('Beautification failed:', error);
    processToast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    onFinish([]);
  }
};
