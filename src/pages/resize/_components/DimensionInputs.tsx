import { Input } from '@/components/ui/input';

type DimensionInputsProps = {
  width: number | null;
  height: number | null;
  onWidthChange: (next: number | null) => void;
  onHeightChange: (next: number | null) => void;
};

const parseDim = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const n = Math.floor(Number(trimmed));
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
};

const DimensionInputs = ({
  width,
  height,
  onWidthChange,
  onHeightChange,
}: DimensionInputsProps) => (
  <div className="space-y-2">
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
      Dimensions
      <span className="ml-2 text-[10px] text-muted-foreground/70 normal-case">
        (leave one blank to auto-scale by aspect)
      </span>
    </label>
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground/80 uppercase tracking-wide">
          Width (px)
        </label>
        <Input
          type="number"
          min={1}
          inputMode="numeric"
          value={width ?? ''}
          onChange={(e) => onWidthChange(parseDim(e.target.value))}
          placeholder="auto"
          className="font-mono"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground/80 uppercase tracking-wide">
          Height (px)
        </label>
        <Input
          type="number"
          min={1}
          inputMode="numeric"
          value={height ?? ''}
          onChange={(e) => onHeightChange(parseDim(e.target.value))}
          placeholder="auto"
          className="font-mono"
        />
      </div>
    </div>
  </div>
);

DimensionInputs.displayName = 'DimensionInputs';

export { DimensionInputs };
