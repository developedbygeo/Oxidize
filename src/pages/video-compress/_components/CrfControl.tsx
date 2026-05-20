import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { crfToQuality, qualityToCrf } from '@/lib/video-quality';

type CrfControlProps = {
  /** Underlying CRF value (0 = lossless, 51 = worst). */
  value: number;
  onChange: (value: number) => void;
};

const CrfControl = ({ value, onChange }: CrfControlProps) => {
  const quality = crfToQuality(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Quality
        </label>
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'text-xs font-mono tabular-nums',
              quality >= 60
                ? 'text-primary'
                : quality <= 40
                ? 'text-destructive'
                : 'text-muted-foreground'
            )}
          >
            {quality}%
          </span>
          <span className="text-[10px] font-mono text-muted-foreground/60">CRF {value}</span>
        </div>
      </div>
      <Slider
        value={[quality]}
        min={0}
        max={100}
        step={1}
        onValueChange={(values) => onChange(qualityToCrf(values[0]))}
        className="**:data-[slot=slider-range]:bg-primary **:data-[slot=slider-thumb]:border-primary"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Smaller file, more loss</span>
        <span>Visually lossless ~75%+</span>
      </div>
    </div>
  );
};

CrfControl.displayName = 'CrfControl';

export { CrfControl };
