import { invoke } from '@tauri-apps/api/core';
import { resolveOutputDir } from '@/lib/utils';
import { createProcessToast } from '@/lib/process-toast';
import { effectsList } from '@/types/image';
import type {
  EffectResult,
  EffectType,
  ImageInfo,
  OperationHistoryItem,
} from '@/types/image';

type RunArgs = {
  images: ImageInfo[];
  selectedEffect: EffectType;
  intensity: number;
  outputDir: string | null;
  onStart: () => void;
  onFinish: (results: EffectResult[]) => void;
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

export const runEffects = async ({
  images,
  selectedEffect,
  intensity,
  outputDir,
  onStart,
  onFinish,
  onOperationComplete,
}: RunArgs) => {
  if (images.length === 0) return;

  const effectInfo = effectsList.find((e) => e.type === selectedEffect);
  onStart();
  const processToast = createProcessToast({
    action: effectInfo?.label || selectedEffect,
    itemCount: images.length,
  });

  try {
    const results = await invoke<EffectResult[]>('apply_image_effects_batch', {
      inputPaths: images.map((img) => img.path),
      options: { effect: selectedEffect, intensity, output_dir: outputDir },
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

      onOperationComplete({
        type: 'effects',
        fileCount: successCount,
        outputDir: dir,
        details: `${effectInfo?.label || selectedEffect} @ ${intensity}%`,
      });
    }
  } catch (error) {
    console.error('Effect application failed:', error);
    processToast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    onFinish([]);
  }
};
