import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { resolveOutputDir } from '@/lib/utils';
import { createProcessToast } from '@/lib/process-toast';
import { formatLabels, effectsList } from '@/types/image';
import type {
  ImageInfo,
  ImageFormat,
  OperationHistoryItem,
  PipelineOptions,
  PipelineResult,
} from '@/types/image';
import type { PipelineFormValues } from './schema';

type UsePipelineExecutionArgs = {
  images: ImageInfo[];
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

const buildOptions = (values: PipelineFormValues): PipelineOptions => ({
  beautify: values.beautifyEnabled
    ? {
        brightness: values.brightness,
        contrast: values.contrast,
        saturation: values.saturation,
        sharpness: values.sharpness,
        exposure: values.exposure,
        hue_shift: values.hueShift,
        temperature: values.temperature,
        white_balance: values.whiteBalance,
      }
    : null,
  effects: values.effectsEnabled
    ? { effect: values.effectType, intensity: values.effectIntensity }
    : null,
  convert: values.convertEnabled
    ? { format: values.convertFormat as ImageFormat, quality: values.convertQuality }
    : null,
  compress: values.compressEnabled ? { quality: values.compressQuality } : null,
  output_dir: values.outputDir,
});

const buildDetails = (values: PipelineFormValues): string[] => {
  const details: string[] = [];
  if (values.beautifyEnabled) details.push('Beautify');
  if (values.effectsEnabled) {
    const label = effectsList.find((e) => e.type === values.effectType)?.label ?? values.effectType;
    details.push(`Effect: ${label}`);
  }
  if (values.convertEnabled) {
    details.push(`Convert to ${formatLabels[values.convertFormat as ImageFormat]}`);
  }
  if (values.compressEnabled) details.push(`Compress @${values.compressQuality}%`);
  return details;
};

export const usePipelineExecution = ({ images, onOperationComplete }: UsePipelineExecutionArgs) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const execute = async (values: PipelineFormValues) => {
    const opCount =
      Number(values.beautifyEnabled) +
      Number(values.effectsEnabled) +
      Number(values.convertEnabled) +
      Number(values.compressEnabled);
    if (images.length === 0 || opCount === 0) return;

    setIsProcessing(true);
    const processToast = createProcessToast({
      progressLabel: 'Running pipeline on',
      doneLabel: 'Pipeline',
      itemCount: images.length,
    });

    try {
      const results = await invoke<PipelineResult[]>('process_pipeline_batch', {
        inputPaths: images.map((img) => img.path),
        options: buildOptions(values),
      });

      const successful = results.filter((r) => r.success);
      const totalSaved = results.reduce(
        (acc, r) => acc + Math.max(0, r.original_size - r.new_size),
        0
      );

      processToast.finish({
        successCount: successful.length,
        failCount: results.length - successful.length,
      });

      if (successful.length > 0 && onOperationComplete) {
        const dir = resolveOutputDir({
          results: successful.map((r) => ({ output_path: r.output_path })),
          fallbackDir: values.outputDir,
          fallbackPath: images[0]?.path,
        });

        onOperationComplete({
          type: 'pipeline',
          fileCount: images.length,
          outputDir: dir,
          details: `Pipeline: ${buildDetails(values).join(' → ')}`,
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
