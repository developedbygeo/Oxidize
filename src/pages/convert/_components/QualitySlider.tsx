type QualitySliderProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
};

const QualitySlider = ({ value, onChange, min = 10, max = 100 }: QualitySliderProps) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Quality
      </label>
      <span className="text-xs font-mono text-primary">{value}%</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full"
    />
    <div className="flex justify-between text-[10px] text-muted-foreground">
      <span>Smaller file</span>
      <span>Better quality</span>
    </div>
  </div>
);

QualitySlider.displayName = 'QualitySlider';

export { QualitySlider };
