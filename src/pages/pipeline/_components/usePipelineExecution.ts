import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { resolveOutputDir } from '@/lib/utils';
import { createProcessToast } from '@/lib/process-toast';
import { formatLabels, effectsList } from '@/types/image';
import type {
  ImageInfo,
  ImageFormat,
  OperationHistoryItem,
  ConversionResult,
  CompressionResult,
  BeautifyResult,
  EffectResult,
} from '@/types/image';
import type { PipelineFormValues } from './schema';

type UsePipelineExecutionArgs = {
  images: ImageInfo[];
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

export const usePipelineExecution = ({ images, onOperationComplete }: UsePipelineExecutionArgs) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const execute = async (values: PipelineFormValues) => {
    const enabledOps = [
      values.convertEnabled && 'convert',
      values.compressEnabled && 'compress',
      values.beautifyEnabled && 'beautify',
      values.effectsEnabled && 'effects',
    ].filter(Boolean) as string[];

    if (images.length === 0 || enabledOps.length === 0) return;

    setIsProcessing(true);
    const processToast = createProcessToast({ action: 'Pipeline', itemCount: images.length });

    let currentPaths = images.map((img) => img.path);
    let totalSaved = 0;
    const outputDir = values.outputDir ?? null;
    const details: string[] = [];
    const intermediateFiles: string[] = [];
    const isLastOp = (op: string) => enabledOps[enabledOps.length - 1] === op;

    try {
      if (values.convertEnabled && currentPaths.length > 0) {
        const results = await invoke<ConversionResult[]>('convert_images_batch', {
          inputPaths: currentPaths,
          options: {
            format: values.convertFormat,
            quality: values.convertQuality,
            output_dir: isLastOp('convert') ? outputDir : null,
            skip_timestamp_dir: !isLastOp('convert'),
          },
        });

        const newPaths = results
          .filter((r) => r.success)
          .map((r) => r.output_path!)
          .filter(Boolean);
        if (!isLastOp('convert')) intermediateFiles.push(...newPaths);
        currentPaths = newPaths;
        details.push(`Converted to ${formatLabels[values.convertFormat as ImageFormat]}`);
      }

      if (values.compressEnabled && currentPaths.length > 0) {
        const results = await invoke<CompressionResult[]>('compress_images_batch', {
          inputPaths: currentPaths,
          options: {
            quality: values.compressQuality,
            output_dir: isLastOp('compress') ? outputDir : null,
            skip_timestamp_dir: !isLastOp('compress'),
          },
        });

        totalSaved += results.reduce((acc, r) => acc + (r.original_size - r.new_size), 0);
        const newPaths = results
          .filter((r) => r.success)
          .map((r) => r.output_path!)
          .filter(Boolean);
        if (!isLastOp('compress')) intermediateFiles.push(...newPaths);
        currentPaths = newPaths;
        details.push(`Compressed at ${values.compressQuality}% quality`);
      }

      if (values.beautifyEnabled && currentPaths.length > 0) {
        const results = await invoke<BeautifyResult[]>('beautify_images_batch', {
          inputPaths: currentPaths,
          options: {
            brightness: values.brightness,
            contrast: values.contrast,
            saturation: values.saturation,
            sharpness: values.sharpness,
            exposure: values.exposure,
            hue_shift: values.hueShift,
            temperature: values.temperature,
            white_balance: values.whiteBalance,
            output_dir: isLastOp('beautify') ? outputDir : null,
            skip_timestamp_dir: !isLastOp('beautify'),
          },
        });

        const newPaths = results
          .filter((r) => r.success)
          .map((r) => r.output_path!)
          .filter(Boolean);
        if (!isLastOp('beautify')) intermediateFiles.push(...newPaths);
        currentPaths = newPaths;
        details.push('Applied beautify adjustments');
      }

      if (values.effectsEnabled && currentPaths.length > 0) {
        const results = await invoke<EffectResult[]>('apply_image_effects_batch', {
          inputPaths: currentPaths,
          options: {
            effect: values.effectType,
            intensity: values.effectIntensity,
            output_dir: isLastOp('effects') ? outputDir : null,
            skip_timestamp_dir: !isLastOp('effects'),
          },
        });

        currentPaths = results
          .filter((r) => r.success)
          .map((r) => r.output_path!)
          .filter(Boolean);
        const effectInfo = effectsList.find((e) => e.type === values.effectType);
        details.push(`Applied ${effectInfo?.label || values.effectType} effect`);
      }

      for (const filePath of intermediateFiles) {
        try {
          await invoke('delete_file', { path: filePath });
        } catch {
          // Ignore deletion errors for intermediate files
        }
      }

      const successCount = currentPaths.length;
      const failCount = images.length - successCount;
      processToast.finish({ successCount, failCount });

      if (successCount > 0 && onOperationComplete) {
        const dir = resolveOutputDir({
          results: currentPaths.map((p): { output_path: string | null } => ({ output_path: p })),
          fallbackDir: outputDir,
          fallbackPath: images[0]?.path,
        });

        onOperationComplete({
          type: 'pipeline',
          fileCount: images.length,
          outputDir: dir,
          details: `Pipeline: ${details.join(' → ')}`,
          totalSaved: totalSaved > 0 ? totalSaved : undefined,
        });
      }
    } catch (error) {
      console.error('Pipeline failed:', error);
      processToast.error(error instanceof Error ? error.message : 'Pipeline execution failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return { isProcessing, execute };
};
