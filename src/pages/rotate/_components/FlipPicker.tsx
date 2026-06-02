import { FlipHorizontal2, FlipVertical2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type FlipPickerProps = {
  horizontal: boolean;
  vertical: boolean;
  onHorizontalChange: (next: boolean) => void;
  onVerticalChange: (next: boolean) => void;
};

const FlipPicker = ({
  horizontal,
  vertical,
  onHorizontalChange,
  onVerticalChange,
}: FlipPickerProps) => (
  <div className="space-y-2">
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
      Flip
    </label>
    <div className="grid grid-cols-2 gap-1.5">
      <button
        type="button"
        onClick={() => onHorizontalChange(!horizontal)}
        title="Mirror left ↔ right"
        className={cn(
          'flex items-center justify-center gap-2 px-3 py-3 rounded-md border transition-colors',
          horizontal
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-muted/30 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
        )}
      >
        <FlipHorizontal2 className="w-4 h-4" strokeWidth={1.75} />
        <span className="text-[11px] font-medium">Horizontal</span>
      </button>
      <button
        type="button"
        onClick={() => onVerticalChange(!vertical)}
        title="Mirror top ↔ bottom"
        className={cn(
          'flex items-center justify-center gap-2 px-3 py-3 rounded-md border transition-colors',
          vertical
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-muted/30 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
        )}
      >
        <FlipVertical2 className="w-4 h-4" strokeWidth={1.75} />
        <span className="text-[11px] font-medium">Vertical</span>
      </button>
    </div>
  </div>
);

FlipPicker.displayName = 'FlipPicker';

export { FlipPicker };
