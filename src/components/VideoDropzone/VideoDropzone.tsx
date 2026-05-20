import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Film, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { expandHeight } from '@/lib/animations';
import { Button } from '@/components/ui/button';
import { formatVideoDuration, type VideoInfo } from '@/types/video';
import { useVideoDropzone } from './useVideoDropzone';

type VideoDropzoneProps = {
  videos: VideoInfo[];
  onVideosChange: (videos: VideoInfo[]) => void;
  maxVideos?: number;
  className?: string;
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const VideoDropzone = ({
  videos,
  onVideosChange,
  maxVideos = 20,
  className,
}: VideoDropzoneProps) => {
  const { isLoading, selectFiles, removeVideo, clearAll } = useVideoDropzone({
    videos,
    onVideosChange,
    maxVideos,
  });
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div className={cn('space-y-3', className)}>
      <div
        onClick={selectFiles}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
        }}
        className={cn(
          'group relative border border-dashed rounded-lg p-6 transition-colors cursor-pointer',
          'hover:border-primary/50 hover:bg-primary/5',
          isDragOver && 'border-primary bg-primary/5',
          isLoading && 'pointer-events-none opacity-70',
          'border-border/50 bg-muted/20'
        )}
      >
        <div className="flex flex-col items-center gap-2">
          {isLoading ? (
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          ) : (
            <div className="p-2.5 rounded-lg bg-primary/10">
              <Film className="w-5 h-5 text-primary" />
            </div>
          )}
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {isLoading ? 'Loading videos...' : 'Drop videos here'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">or click to browse</p>
          </div>
          <p className="text-[10px] text-muted-foreground">
            MP4, WebM, MKV, MOV, AVI, M4V, WMV, FLV, MPG
          </p>
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {videos.length > 0 && (
          <motion.div
            variants={expandHeight}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">
                {videos.length} video{videos.length !== 1 ? 's' : ''}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-6 px-2 text-[10px] text-muted-foreground hover:text-destructive"
              >
                Clear
              </Button>
            </div>

            <div className="space-y-1 max-h-60 overflow-y-auto">
              {videos.map((video, index) => (
                <div
                  key={video.path}
                  className="group relative flex items-center gap-3 p-2 rounded-md bg-muted/30 border border-border/30"
                >
                  <div className="p-1.5 rounded bg-primary/10 shrink-0">
                    <Film className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{video.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                      <span>
                        {video.width}×{video.height}
                      </span>
                      <span>·</span>
                      <span>{formatVideoDuration(video.duration_seconds)}</span>
                      <span>·</span>
                      <span>{formatBytes(video.size)}</span>
                      <span>·</span>
                      <span className="uppercase">{video.video_codec}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeVideo(index);
                    }}
                    className="p-1 rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

VideoDropzone.displayName = 'VideoDropzone';

export { VideoDropzone };
