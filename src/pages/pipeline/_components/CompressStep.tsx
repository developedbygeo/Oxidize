import { motion, AnimatePresence } from 'motion/react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { expandHeight } from '@/lib/animations';
import { Slider } from '@/components/ui/slider';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { EnableSwitch } from './EnableSwitch';
import type { PipelineFormValues } from './schema';

type CompressStepProps = {
  form: UseFormReturn<PipelineFormValues>;
};

const CompressStep = ({ form }: CompressStepProps) => {
  const enabled = useWatch({ control: form.control, name: 'compressEnabled' });

  return (
    <div className="space-y-6">
      <EnableSwitch
        control={form.control}
        name="compressEnabled"
        label="Enable Compression"
        description="Reduce file sizes"
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
              name="compressQuality"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between">
                    <FormLabel>Compression Quality</FormLabel>
                    <span className="text-sm font-mono text-primary">{field.value}%</span>
                  </div>
                  <FormControl>
                    <Slider
                      value={[field.value]}
                      onValueChange={([v]) => field.onChange(v)}
                      min={10}
                      max={100}
                      step={1}
                      className="**:data-[slot=slider-range]:bg-primary **:data-[slot=slider-thumb]:border-primary"
                    />
                  </FormControl>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Smaller file</span>
                    <span>Better quality</span>
                  </div>
                </FormItem>
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

CompressStep.displayName = 'CompressStep';

export { CompressStep };
