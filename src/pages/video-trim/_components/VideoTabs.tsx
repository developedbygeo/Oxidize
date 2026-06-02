import { Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatVideoDuration } from '@/types/video';
import type { VideoInfo } from '@/types/video';

type VideoTabsProps = {
  videos: VideoInfo[];
  activeIndex: number;
  trims: Record<string, { start: number; end: number }>;
  onSelect: (index: number) => void;
};

/**
 * Per-file tab strip. Each tab shows the file name + the trim duration so
 * users can see at a glance which clips are configured.
 */
const VideoTabs = ({ videos, activeIndex, trims, onSelect }: VideoTabsProps) => {
  if (videos.length <= 1) return null;

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {videos.map((video, index) => {
        const isActive = index === activeIndex;
        const trim = trims[video.path];
        const trimmed = trim ? Math.max(0, trim.end - trim.start) : video.duration_seconds;
        return (
          <button
            key={video.path}
            onClick={() => onSelect(index)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-left shrink-0 transition-colors min-w-0',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
            )}
          >
            <Film className="w-3 h-3 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium truncate max-w-[12rem]">{video.name}</p>
              <p className="text-[9px] font-mono tabular-nums opacity-70">
                {formatVideoDuration(trimmed)}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
};

VideoTabs.displayName = 'VideoTabs';

export { VideoTabs };
