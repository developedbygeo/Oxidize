import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

type AdjustmentSliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  icon: LucideIcon;
  unit?: string;
};

const AdjustmentSlider = ({
  label,
  value,
  min,
  max,
  onChange,
  icon: Icon,
  unit = '',
}: AdjustmentSliderProps) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3 h-3 text-muted-foreground" strokeWidth={1.75} />
        <span className="text-[11px] font-medium text-foreground">{label}</span>
      </div>
      <span
        className={cn(
          'text-[10px] font-mono tabular-nums',
          value === 0 ? 'text-muted-foreground' : 'text-primary'
        )}
      >
        {value > 0 ? '+' : ''}
        {value}
        {unit}
      </span>
    </div>
    <Slider
      value={[value]}
      min={min}
      max={max}
      step={1}
      onValueChange={(values) => onChange(values[0])}
      className="**:data-[slot=slider-track]:h-1 **:data-[slot=slider-range]:bg-primary **:data-[slot=slider-thumb]:border-primary **:data-[slot=slider-thumb]:size-3"
    />
  </div>
);

AdjustmentSlider.displayName = 'AdjustmentSlider';

export { AdjustmentSlider };
