import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VideoInfo } from '@/types/video';

type VideoProgressListProps = {
  videos: VideoInfo[];
  /** Map of input path → progress 0..1, as returned by useFfmpegProgress. */
  progress: Record<string, number>;
};

/** Per-file progress bars shown while an ffmpeg batch is running. */
const VideoProgressList = ({ videos, progress }: VideoProgressListProps) => (
  <div className="space-y-1.5">
    {videos.map((video) => {
      const value = progress[video.path] ?? 0;
      const percent = Math.round(value * 100);
      const isActive = value > 0 && value < 1;
      const isDone = value >= 1;
      return (
        <div
          key={video.path}
          className="rounded-md border border-border/40 bg-muted/20 p-2 space-y-1.5"
        >
          <div className="flex items-center gap-2">
            {isActive && <Loader2 className="w-3 h-3 text-primary animate-spin shrink-0" />}
            <span className="text-[11px] text-foreground truncate flex-1">{video.name}</span>
            <span
              className={cn(
                'text-[10px] font-mono tabular-nums shrink-0',
                isDone ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {percent}%
            </span>
          </div>
          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-[width] duration-100"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      );
    })}
  </div>
);

VideoProgressList.displayName = 'VideoProgressList';

export { VideoProgressList };
