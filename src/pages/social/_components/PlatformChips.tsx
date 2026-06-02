import { cn } from '@/lib/utils';
import { PLATFORM_LABELS, PLATFORM_ORDER, type PresetPlatform } from '@/lib/social-presets';

type PlatformChipsProps = {
  value: PresetPlatform | 'all';
  onChange: (next: PresetPlatform | 'all') => void;
};

const PlatformChips = ({ value, onChange }: PlatformChipsProps) => (
  <div className="space-y-2">
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
      Platform
    </label>
    <div className="flex flex-wrap gap-1.5">
      <Chip active={value === 'all'} onClick={() => onChange('all')}>
        All
      </Chip>
      {PLATFORM_ORDER.map((p) => (
        <Chip key={p} active={value === p} onClick={() => onChange(p)}>
          {PLATFORM_LABELS[p]}
        </Chip>
      ))}
    </div>
  </div>
);

const Chip = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors',
      active
        ? 'bg-primary text-primary-foreground border-primary'
        : 'bg-muted/30 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
    )}
  >
    {children}
  </button>
);

PlatformChips.displayName = 'PlatformChips';

export { PlatformChips };
