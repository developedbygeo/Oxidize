import type { Control, FieldPath } from 'react-hook-form';
import { Switch } from '@/components/ui/switch';
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import type { PipelineFormValues } from './schema';

type BooleanFieldName = {
  [K in FieldPath<PipelineFormValues>]: PipelineFormValues[K] extends boolean ? K : never;
}[FieldPath<PipelineFormValues>];

type EnableSwitchProps = {
  control: Control<PipelineFormValues>;
  name: BooleanFieldName;
  label: string;
  description: string;
};

const EnableSwitch = ({ control, name, label, description }: EnableSwitchProps) => (
  <FormField
    control={control}
    name={name}
    render={({ field }) => (
      <FormItem className="flex items-center justify-between rounded-xl border border-border/50 p-4 bg-muted/30">
        <div>
          <FormLabel className="text-base font-semibold">{label}</FormLabel>
          <FormDescription>{description}</FormDescription>
        </div>
        <FormControl>
          <Switch checked={field.value} onCheckedChange={field.onChange} />
        </FormControl>
      </FormItem>
    )}
  />
);

EnableSwitch.displayName = 'EnableSwitch';

export { EnableSwitch };
