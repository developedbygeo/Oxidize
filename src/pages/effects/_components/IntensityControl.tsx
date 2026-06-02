import { Slider } from '@/components/ui/slider';

type IntensityControlProps = {
  value: number;
  onChange: (value: number) => void;
};

const IntensityControl = ({ value, onChange }: IntensityControlProps) => (
  <div className="space-y-2">
    <h2 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
      Intensity
    </h2>
    <div className="p-2.5 rounded-md bg-muted/20 border border-border/30 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">Effect strength</span>
        <span className="text-[10px] font-mono tabular-nums text-primary">{value}%</span>
      </div>
      <Slider
        value={[value]}
        min={0}
        max={100}
        step={1}
        onValueChange={(values) => onChange(values[0])}
        className="**:data-[slot=slider-track]:h-1 **:data-[slot=slider-range]:bg-primary **:data-[slot=slider-thumb]:border-primary **:data-[slot=slider-thumb]:size-3"
      />
      <div className="flex justify-between text-[9px] text-muted-foreground">
        <span>Subtle</span>
        <span>Strong</span>
      </div>
    </div>
  </div>
);

IntensityControl.displayName = 'IntensityControl';

export { IntensityControl };
