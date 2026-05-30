import { Image as ImageIcon, FileVideo } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PresetMediaType } from '@/lib/social-presets';

type Filter = PresetMediaType | 'all';

type MediaTypeChipsProps = {
  value: Filter;
  onChange: (next: Filter) => void;
};

const MediaTypeChips = ({ value, onChange }: MediaTypeChipsProps) => (
  <div className="space-y-2">
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
      Media type
    </label>
    <div className="flex gap-1.5">
      <Chip active={value === 'all'} onClick={() => onChange('all')}>
        All
      </Chip>
      <Chip active={value === 'image'} onClick={() => onChange('image')} icon={ImageIcon}>
        Images
      </Chip>
      <Chip active={value === 'video'} onClick={() => onChange('video')} icon={FileVideo}>
        Videos
      </Chip>
    </div>
  </div>
);

const Chip = ({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: typeof ImageIcon;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors',
      active
        ? 'bg-primary text-primary-foreground border-primary'
        : 'bg-muted/30 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
    )}
  >
    {Icon && <Icon className="w-3 h-3" strokeWidth={2} />}
    {children}
  </button>
);

MediaTypeChips.displayName = 'MediaTypeChips';

export { MediaTypeChips };
