import { useEffect, useRef } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { VideoInfo } from '@/types/video';

type VideoPlayerProps = {
  video: VideoInfo;
  onTimeUpdate?: (currentTime: number) => void;
};

/**
 * Native `<video>` element backed by Tauri's asset protocol so the file
 * streams from disk instead of being loaded into a data URL.
 *
 * `key={video.path}` on the element (handled by the parent) re-mounts when
 * the active video changes so the new src loads cleanly.
 */
const VideoPlayer = ({ video, onTimeUpdate }: VideoPlayerProps) => {
  const ref = useRef<HTMLVideoElement | null>(null);
  const src = convertFileSrc(video.path);

  // Reset playhead to 0 when the source changes.
  useEffect(() => {
    if (ref.current) ref.current.currentTime = 0;
  }, [video.path]);

  return (
    <div className="rounded-lg overflow-hidden border border-border/40 bg-black">
      <video
        ref={ref}
        src={src}
        controls
        preload="metadata"
        className="w-full max-h-[420px] block"
        onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
      />
    </div>
  );
};

VideoPlayer.displayName = 'VideoPlayer';

export { VideoPlayer };
