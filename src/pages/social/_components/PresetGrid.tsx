import { Image as ImageIcon, FileVideo, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PLATFORM_LABELS, type SocialPreset } from '@/lib/social-presets';

type PresetGridProps = {
  presets: SocialPreset[];
  selectedId: string | null;
  onSelect: (preset: SocialPreset) => void;
};

const PresetGrid = ({ presets, selectedId, onSelect }: PresetGridProps) => {
  if (presets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/40 bg-muted/10 p-8 text-center text-xs text-muted-foreground">
        No presets match this filter.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
      {presets.map((preset) => {
        const active = preset.id === selectedId;
        const Icon = preset.mediaType === 'image' ? ImageIcon : FileVideo;
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelect(preset)}
            className={cn(
              'group relative text-left p-3 rounded-md border transition-colors',
              active
                ? 'bg-primary/10 border-primary'
                : 'bg-muted/20 border-border/40 hover:bg-muted/40 hover:border-border/60'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Icon
                    className={cn(
                      'w-3 h-3 shrink-0',
                      active ? 'text-primary' : 'text-muted-foreground'
                    )}
                    strokeWidth={2}
                  />
                  <span
                    className={cn(
                      'text-[10px] font-medium uppercase tracking-wide',
                      active ? 'text-primary' : 'text-muted-foreground/80'
                    )}
                  >
                    {PLATFORM_LABELS[preset.platform]}
                  </span>
                </div>
                <p className="text-xs font-semibold text-foreground mt-1 truncate">
                  {preset.name}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  {preset.description}
                </p>
              </div>
              {active && (
                <Check className="w-3.5 h-3.5 text-primary shrink-0" strokeWidth={2.5} />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

PresetGrid.displayName = 'PresetGrid';

export { PresetGrid };
