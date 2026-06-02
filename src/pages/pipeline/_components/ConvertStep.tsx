import { motion, AnimatePresence } from 'motion/react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { expandHeight, buttonPress } from '@/lib/animations';
import { Slider } from '@/components/ui/slider';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { EnableSwitch } from './EnableSwitch';
import { formatOptions, type PipelineFormValues } from './schema';

type ConvertStepProps = {
  form: UseFormReturn<PipelineFormValues>;
};

const ConvertStep = ({ form }: ConvertStepProps) => {
  const enabled = useWatch({ control: form.control, name: 'convertEnabled' });

  return (
    <div className="space-y-6">
      <EnableSwitch
        control={form.control}
        name="convertEnabled"
        label="Enable Conversion"
        description="Change the image format"
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
              name="convertFormat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Output Format</FormLabel>
                  <div className="grid grid-cols-3 gap-2">
                    {formatOptions.map((option) => (
                      <motion.button
                        key={option.value}
                        type="button"
                        {...buttonPress}
                        onClick={() => field.onChange(option.value)}
                        className={cn(
                          'p-3 rounded-xl border-2 transition-all text-sm font-medium',
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

            <FormField
              control={form.control}
              name="convertQuality"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between">
                    <FormLabel>Quality</FormLabel>
                    <span className="text-sm font-mono text-primary">{field.value}%</span>
                  </div>
                  <FormControl>
                    <Slider
                      value={[field.value]}
                      onValueChange={([v]) => field.onChange(v)}
                      min={1}
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
    </div>
  );
};

ConvertStep.displayName = 'ConvertStep';

export { ConvertStep };
