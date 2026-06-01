import { cn } from '@/lib/utils';
import type { WatermarkPosition } from '@/types/image';

type PositionGridProps = {
  value: WatermarkPosition;
  onChange: (next: WatermarkPosition) => void;
};

const CELLS: { position: WatermarkPosition; label: string }[] = [
  { position: 'top-left', label: 'Top left' },
  { position: 'top-center', label: 'Top centre' },
  { position: 'top-right', label: 'Top right' },
  { position: 'middle-left', label: 'Middle left' },
  { position: 'middle-center', label: 'Centre' },
  { position: 'middle-right', label: 'Middle right' },
  { position: 'bottom-left', label: 'Bottom left' },
  { position: 'bottom-center', label: 'Bottom centre' },
  { position: 'bottom-right', label: 'Bottom right' },
];

const PositionGrid = ({ value, onChange }: PositionGridProps) => (
  <div className="space-y-2">
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
      Position
    </label>
    <div className="grid grid-cols-3 gap-1.5 aspect-[3/1] max-w-48">
      {CELLS.map(({ position, label }) => {
        const active = position === value;
        return (
          <button
            key={position}
            type="button"
            onClick={() => onChange(position)}
            title={label}
            aria-label={label}
            aria-pressed={active}
            className={cn(
              'flex items-center justify-center rounded-md border transition-colors',
              active
                ? 'bg-primary/10 border-primary'
                : 'bg-muted/30 border-transparent hover:bg-muted'
            )}
          >
            <span
              className={cn(
                'rounded-full transition-all',
                active ? 'size-2.5 bg-primary' : 'size-1.5 bg-muted-foreground/50'
              )}
            />
          </button>
        );
      })}
    </div>
  </div>
);

PositionGrid.displayName = 'PositionGrid';

export { PositionGrid };
