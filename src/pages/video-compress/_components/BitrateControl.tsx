import { Slider } from '@/components/ui/slider';

type BitrateControlProps = {
  value: number;
  onChange: (value: number) => void;
};

const formatBitrate = (kbps: number): string => {
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(kbps % 1000 === 0 ? 0 : 1)} Mbps`;
  return `${kbps} kbps`;
};

const BitrateControl = ({ value, onChange }: BitrateControlProps) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Target bitrate
      </label>
      <span className="text-xs font-mono tabular-nums text-primary">{formatBitrate(value)}</span>
    </div>
    <Slider
      value={[value]}
      min={250}
      max={20000}
      step={250}
      onValueChange={(values) => onChange(values[0])}
      className="**:data-[slot=slider-range]:bg-primary **:data-[slot=slider-thumb]:border-primary"
    />
    <div className="flex justify-between text-[10px] text-muted-foreground">
      <span>Small file</span>
      <span>High quality</span>
    </div>
  </div>
);

BitrateControl.displayName = 'BitrateControl';

export { BitrateControl };
