import { motion, AnimatePresence } from 'motion/react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { expandHeight, fadeUp, buttonPress } from '@/lib/animations';
import { Slider } from '@/components/ui/slider';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { EffectsPreview } from '@/components/EffectsPreview';
import { PreviewNavigation } from '@/components/PreviewNavigation';
import { effectsList, type ImageInfo } from '@/types/image';
import { EnableSwitch } from './EnableSwitch';
import type { PipelineFormValues } from './schema';
import { useEffectsPreviewOptions } from './usePreviewOptions';

type EffectsStepProps = {
  form: UseFormReturn<PipelineFormValues>;
  images: ImageInfo[];
  previewIndex: number;
  onPrevImage: () => void;
  onNextImage: () => void;
};

const EffectsStep = ({ form, images, previewIndex, onPrevImage, onNextImage }: EffectsStepProps) => {
  const enabled = useWatch({ control: form.control, name: 'effectsEnabled' });
  const previewOptions = useEffectsPreviewOptions(form.control);
  const previewImage = images[previewIndex] ?? images[0];

  return (
    <div className="space-y-6">
      <EnableSwitch
        control={form.control}
        name="effectsEnabled"
        label="Enable Effects"
        description="Apply visual filters"
      />

      <AnimatePresence>
        {enabled && (
          <motion.div
            variants={expandHeight}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="effectType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Effect Type</FormLabel>
                  <div className="grid grid-cols-5 gap-2">
                    {effectsList.map((effect) => (
                      <motion.button
                        key={effect.type}
                        type="button"
                        {...buttonPress}
                        onClick={() => field.onChange(effect.type)}
                        className={cn(
                          'p-2 rounded-xl border-2 transition-all text-center',
                          field.value === effect.type
                            ? 'border-primary bg-primary/10'
                            : 'border-border/50 hover:border-primary/50'
                        )}
                      >
                        <effect.icon
                          className={cn(
                            'w-4 h-4 mx-auto',
                            field.value === effect.type ? 'text-primary' : 'text-muted-foreground'
                          )}
                          strokeWidth={1.75}
                        />
                        <span
                          className={cn(
                            'block text-xs font-medium mt-1',
                            field.value === effect.type ? 'text-primary' : 'text-foreground'
                          )}
                        >
                          {effect.label}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="effectIntensity"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between">
                    <FormLabel>Intensity</FormLabel>
                    <span className="text-sm font-mono text-primary">{field.value}%</span>
                  </div>
                  <FormControl>
                    <Slider
                      value={[field.value]}
                      onValueChange={([v]) => field.onChange(v)}
                      min={0}
                      max={100}
                      step={1}
                      className="**:data-[slot=slider-range]:bg-primary **:data-[slot=slider-thumb]:border-primary"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {enabled && previewImage && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="mt-4">
          <PreviewNavigation
            currentIndex={previewIndex}
            total={images.length}
            onPrev={onPrevImage}
            onNext={onNextImage}
          >
            <EffectsPreview src={previewImage.thumbnail} options={previewOptions} className="h-75" />
          </PreviewNavigation>
        </motion.div>
      )}
    </div>
  );
};

EffectsStep.displayName = 'EffectsStep';

export { EffectsStep };
