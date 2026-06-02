import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

type CustomDimensionsProps = {
  width: number;
  height: number;
  maintainAspect: boolean;
  onWidthChange: (value: number) => void;
  onHeightChange: (value: number) => void;
  onMaintainAspectChange: (value: boolean) => void;
};

const parseDimension = (raw: string): number => {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  // Snap to even — encoders often refuse odd dimensions.
  return n - (n % 2);
};

const CustomDimensions = ({
  width,
  height,
  maintainAspect,
  onWidthChange,
  onHeightChange,
  onMaintainAspectChange,
}: CustomDimensionsProps) => (
  <div className="space-y-3">
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Width
        </label>
        <input
          type="number"
          min={2}
          max={7680}
          step={2}
          value={width}
          onChange={(e) => onWidthChange(parseDimension(e.target.value))}
          className={cn(
            'w-full h-9 px-3 rounded-md border border-border bg-background text-sm font-mono tabular-nums',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent'
          )}
        />
      </div>
      <div className={cn('space-y-1', maintainAspect && 'opacity-50')}>
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Height {maintainAspect && '(auto)'}
        </label>
        <input
          type="number"
          min={2}
          max={4320}
          step={2}
          value={height}
          onChange={(e) => onHeightChange(parseDimension(e.target.value))}
          disabled={maintainAspect}
          className={cn(
            'w-full h-9 px-3 rounded-md border border-border bg-background text-sm font-mono tabular-nums',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
            'disabled:cursor-not-allowed'
          )}
        />
      </div>
    </div>

    <div className="flex items-center justify-between rounded-md border border-border/40 bg-muted/20 p-3">
      <div>
        <p className="text-xs font-medium text-foreground">Maintain aspect ratio</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Height is derived from width to preserve the source aspect.
        </p>
      </div>
      <Switch checked={maintainAspect} onCheckedChange={onMaintainAspectChange} />
    </div>
  </div>
);

CustomDimensions.displayName = 'CustomDimensions';

export { CustomDimensions };
