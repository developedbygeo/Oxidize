import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

type CrfSliderProps = {
  value: number;
  onChange: (value: number) => void;
};

const CrfSlider = ({ value, onChange }: CrfSliderProps) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Quality (CRF)
      </label>
      <span
        className={cn(
          'text-xs font-mono tabular-nums',
          value <= 20 ? 'text-primary' : value >= 30 ? 'text-destructive' : 'text-muted-foreground'
        )}
      >
        {value}
      </span>
    </div>
    <Slider
      value={[value]}
      min={0}
      max={51}
      step={1}
      onValueChange={(values) => onChange(values[0])}
      className="**:data-[slot=slider-range]:bg-primary **:data-[slot=slider-thumb]:border-primary"
    />
    <div className="flex justify-between text-[10px] text-muted-foreground">
      <span>Higher quality, larger file</span>
      <span>Smaller file, more loss</span>
    </div>
  </div>
);

CrfSlider.displayName = 'CrfSlider';

export { CrfSlider };
