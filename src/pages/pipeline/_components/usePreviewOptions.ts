import { useMemo } from 'react';
import { useWatch, type Control } from 'react-hook-form';
import type { PreviewOptions, EffectPreviewOptions } from '@/lib/image-preview';
import type { PipelineFormValues } from './schema';

export const useBeautifyPreviewOptions = (control: Control<PipelineFormValues>): PreviewOptions => {
  const values = useWatch({
    control,
    name: [
      'brightness',
      'contrast',
      'saturation',
      'sharpness',
      'exposure',
      'hueShift',
      'temperature',
      'whiteBalance',
    ],
  });

  return useMemo(
    () => ({
      brightness: values[0],
      contrast: values[1],
      saturation: values[2],
      sharpness: values[3],
      exposure: values[4],
      hueShift: values[5],
      temperature: values[6],
      whiteBalance: values[7],
    }),
    [values]
  );
};

export const useEffectsPreviewOptions = (
  control: Control<PipelineFormValues>
): EffectPreviewOptions => {
  const values = useWatch({ control, name: ['effectType', 'effectIntensity'] });

  return useMemo(
    () => ({
      effect: values[0],
      intensity: values[1],
    }),
    [values]
  );
};
