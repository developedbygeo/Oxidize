import { motion, AnimatePresence } from 'motion/react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { expandHeight, fadeUp, buttonPress } from '@/lib/animations';
import { Slider } from '@/components/ui/slider';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { ImagePreview } from '@/components/ImagePreview';
import { PreviewNavigation } from '@/components/PreviewNavigation';
import type { ImageInfo } from '@/types/image';
import { EnableSwitch } from './EnableSwitch';
import { beautifySliders, whiteBalanceOptions, type PipelineFormValues } from './schema';
import { useBeautifyPreviewOptions } from './usePreviewOptions';

type BeautifyStepProps = {
  form: UseFormReturn<PipelineFormValues>;
  images: ImageInfo[];
  previewIndex: number;
  onPrevImage: () => void;
  onNextImage: () => void;
};

const BeautifyStep = ({ form, images, previewIndex, onPrevImage, onNextImage }: BeautifyStepProps) => {
  const enabled = useWatch({ control: form.control, name: 'beautifyEnabled' });
  const previewOptions = useBeautifyPreviewOptions(form.control);
  const previewImage = images[previewIndex] ?? images[0];

  return (
    <div className="space-y-6">
      <EnableSwitch
        control={form.control}
        name="beautifyEnabled"
        label="Enable Beautify"
        description="Enhance image appearance"
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
            <div className="grid grid-cols-2 gap-4">
              {beautifySliders.map((slider) => (
                <FormField
                  key={slider.name}
                  control={form.control}
                  name={slider.name}
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between">
                        <FormLabel className="text-xs">{slider.label}</FormLabel>
                        <span className="text-xs font-mono text-primary">{field.value}</span>
                      </div>
                      <FormControl>
                        <Slider
                          value={[field.value]}
                          onValueChange={([v]) => field.onChange(v)}
                          min={slider.min}
                          max={slider.max}
                          step={1}
                          className="**:data-[slot=slider-range]:bg-primary **:data-[slot=slider-thumb]:border-primary"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <FormField
              control={form.control}
              name="whiteBalance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>White Balance</FormLabel>
                  <div className="grid grid-cols-5 gap-2">
                    {whiteBalanceOptions.map((option) => (
                      <motion.button
                        key={option.value}
                        type="button"
                        {...buttonPress}
                        onClick={() => field.onChange(option.value)}
                        className={cn(
                          'p-2 rounded-lg border-2 transition-all text-xs font-medium',
                          field.value === option.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border/50 hover:border-primary/50'
                        )}
                      >
                        {option.label}
                      </motion.button>
                    ))}
                  </div>
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
            <ImagePreview src={previewImage.thumbnail} options={previewOptions} className="h-75" />
          </PreviewNavigation>
        </motion.div>
      )}
    </div>
  );
};

BeautifyStep.displayName = 'BeautifyStep';

export { BeautifyStep };
