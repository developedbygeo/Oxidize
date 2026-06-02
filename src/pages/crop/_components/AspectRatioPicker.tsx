import { cn } from '@/lib/utils';
import { aspectRatios, type AspectRatioId } from './schema';

type AspectRatioPickerProps = {
  value: AspectRatioId;
  onChange: (id: AspectRatioId) => void;
  size?: 'sm' | 'md';
};

const AspectRatioPicker = ({ value, onChange, size = 'md' }: AspectRatioPickerProps) => (
  <div className="space-y-1.5">
    <label
      className={cn(
        'font-medium text-muted-foreground uppercase tracking-wide',
        size === 'sm' ? 'text-[10px]' : 'text-xs'
      )}
    >
      Aspect ratio
    </label>
    <div className="grid grid-cols-4 gap-1.5">
      {aspectRatios.map((r) => {
        const active = r.id === value;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onChange(r.id)}
            className={cn(
              'rounded-md font-medium transition-colors',
              size === 'sm' ? 'px-1.5 py-1 text-[10px]' : 'px-2 py-1.5 text-xs',
              active
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  </div>
);

AspectRatioPicker.displayName = 'AspectRatioPicker';

export { AspectRatioPicker };
