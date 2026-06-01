import type { LucideIcon } from 'lucide-react';
import { Droplets, Maximize, Frame } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

type Row = {
  label: string;
  icon: LucideIcon;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
};

const SliderRow = ({ label, icon: Icon, value, min, max, step, onChange }: Row) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3 h-3 text-muted-foreground" strokeWidth={1.75} />
        <span className="text-[11px] font-medium text-foreground">{label}</span>
      </div>
      <span className="text-[10px] font-mono tabular-nums text-primary">{value}%</span>
    </div>
    <Slider
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={(values) => onChange(values[0])}
      className="**:data-[slot=slider-track]:h-1 **:data-[slot=slider-range]:bg-primary **:data-[slot=slider-thumb]:border-primary **:data-[slot=slider-thumb]:size-3"
    />
  </div>
);

type WatermarkSlidersProps = {
  opacity: number;
  scalePercent: number;
  marginPercent: number;
  onOpacityChange: (value: number) => void;
  onScaleChange: (value: number) => void;
  onMarginChange: (value: number) => void;
};

const WatermarkSliders = ({
  opacity,
  scalePercent,
  marginPercent,
  onOpacityChange,
  onScaleChange,
  onMarginChange,
}: WatermarkSlidersProps) => (
  <div className="space-y-3.5">
    <SliderRow
      label="Opacity"
      icon={Droplets}
      value={opacity}
      min={0}
      max={100}
      step={1}
      onChange={onOpacityChange}
    />
    <SliderRow
      label="Size (% of width)"
      icon={Maximize}
      value={scalePercent}
      min={1}
      max={100}
      step={1}
      onChange={onScaleChange}
    />
    <SliderRow
      label="Margin (% of width)"
      icon={Frame}
      value={marginPercent}
      min={0}
      max={25}
      step={1}
      onChange={onMarginChange}
    />
  </div>
);

WatermarkSliders.displayName = 'WatermarkSliders';

export { WatermarkSliders };
