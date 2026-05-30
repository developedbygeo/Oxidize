import { invoke } from '@tauri-apps/api/core';
import { resolveOutputDir } from '@/lib/utils';
import { createProcessToast } from '@/lib/process-toast';
import { isCancelledError, isSkippedError } from '@/lib/ffmpeg-errors';
import { firstImageError, humanizeImageError } from '@/lib/image-errors';
import { toOutputNaming } from '@/types/output-naming';
import { effectsList } from '@/types/image';
import type { EffectResult, ImageInfo, OperationHistoryItem } from '@/types/image';
import type { EffectsFormValues } from './schema';

type RunArgs = {
  images: ImageInfo[];
  values: EffectsFormValues;
  onStart: () => void;
  onFinish: (results: EffectResult[]) => void;
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

export const runEffects = async ({
  images,
  values,
  onStart,
  onFinish,
  onOperationComplete,
}: RunArgs) => {
  if (images.length === 0) return;

  const { selectedEffect, intensity, outputDir, filenameTemplate, overwriteMode } = values;
  const effectInfo = effectsList.find((e) => e.type === selectedEffect);
  const label = effectInfo?.label || selectedEffect;
  onStart();
  const processToast = createProcessToast({
    progressLabel: `Applying ${label.toLowerCase()}`,
    doneLabel: `${label} effect`,
    itemCount: images.length,
  });

  try {
    const results = await invoke<EffectResult[]>('apply_image_effects_batch', {
      inputPaths: images.map((img) => img.path),
      options: {
        effect: selectedEffect,
        intensity,
        output_dir: outputDir,
        naming: toOutputNaming(filenameTemplate, overwriteMode),
      },
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
      processToast.finish({ successCount, failCount, firstError: firstImageError(results) });
    }

    if (successCount > 0 && onOperationComplete) {
      const dir = resolveOutputDir({
        results: results.filter((r) => r.success),
        fallbackDir: outputDir,
        fallbackPath: images[0]?.path,
      });

      onOperationComplete({
        type: 'effects',
        fileCount: successCount,
        outputDir: dir,
        details: `${label} @ ${intensity}%`,
      });
    }
  } catch (error) {
    console.error('Effect application failed:', error);
    const friendly = humanizeImageError(error);
    processToast.error({ title: friendly.title, description: friendly.details });
    onFinish([]);
  }
};
