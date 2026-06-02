import { cn } from '@/lib/utils';
import type { VideoInfo } from '@/types/video';
import { resolutionPresets } from './schema';

type ResolutionPresetPickerProps = {
  value: number;
  onChange: (height: number) => void;
  videos: VideoInfo[];
};

const ResolutionPresetPicker = ({ value, onChange, videos }: ResolutionPresetPickerProps) => {
  // Warn the user about presets that would upscale every loaded video.
  const sourceMaxHeight = videos.reduce((max, v) => Math.max(max, v.height), 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Target resolution
        </label>
        {sourceMaxHeight > 0 && (
          <span className="text-[10px] text-muted-foreground">Source: up to {sourceMaxHeight}p</span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {resolutionPresets.map((preset) => {
          const isActive = value === preset.height;
          const wouldUpscale = sourceMaxHeight > 0 && preset.height > sourceMaxHeight;
          return (
            <button
              key={preset.height}
              onClick={() => onChange(preset.height)}
              className={cn(
                'p-2.5 rounded-md text-left transition-colors',
                isActive ? 'bg-primary text-primary-foreground' : 'bg-muted/50 hover:bg-muted'
              )}
            >
              <span className={cn('block text-xs font-medium', isActive ? '' : 'text-foreground')}>
                {preset.label}
                {wouldUpscale && (
                  <span
                    className={cn(
                      'ml-1 text-[9px] font-normal',
                      isActive ? 'text-primary-foreground/70' : 'text-amber-600 dark:text-amber-400'
                    )}
                  >
                    (upscale)
                  </span>
                )}
              </span>
              <span
                className={cn(
                  'block text-[10px] mt-0.5',
                  isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'
                )}
              >
                {preset.description}
              </span>
            </button>
          );
        })}
      </div>
      {sourceMaxHeight > 0 && value > sourceMaxHeight && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400">
          Heads up: this preset upscales the source. ffmpeg can do it, but the result is
          interpolated and will look soft — no extra detail is invented.
        </p>
      )}
    </div>
  );
};

ResolutionPresetPicker.displayName = 'ResolutionPresetPicker';

export { ResolutionPresetPicker };
