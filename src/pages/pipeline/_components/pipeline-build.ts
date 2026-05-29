import { formatLabels, effectsList } from '@/types/image';
import type { ImageFormat, PipelineOptions } from '@/types/image';
import type { PipelineFormValues } from './schema';

const isCropActive = (values: PipelineFormValues): boolean =>
  values.cropEnabled && values.cropWidth > 0 && values.cropHeight > 0;

export const buildOptions = (values: PipelineFormValues): PipelineOptions => ({
  crop: isCropActive(values)
    ? {
        x: values.cropX,
        y: values.cropY,
        width: values.cropWidth,
        height: values.cropHeight,
      }
    : null,
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

export const buildDetails = (values: PipelineFormValues): string[] => {
  const details: string[] = [];
  if (isCropActive(values)) {
    details.push(`Crop ${values.cropWidth}×${values.cropHeight}`);
  }
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

/**
 * Pipeline has work iff at least one operation is enabled AND the active set
 * resolves to a non-empty option set. Crop is a special case: enabled with a
 * zero-area rect contributes nothing, so we check the same condition
 * `buildOptions` uses to populate the `crop` field.
 */
export const hasPipelineWork = (values: PipelineFormValues): boolean =>
  isCropActive(values) ||
  values.beautifyEnabled ||
  values.effectsEnabled ||
  values.convertEnabled ||
  values.compressEnabled;
