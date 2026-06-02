import { useState } from 'react';
import { PreviewNavigation } from '@/components/PreviewNavigation';
import type { ImageInfo } from '@/types/image';

type SourcePreviewProps = {
  images: ImageInfo[];
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const SourcePreview = ({ images }: SourcePreviewProps) => {
  const [index, setIndex] = useState(0);

  if (images.length === 0) return null;

  const safeIndex = Math.min(index, images.length - 1);
  const current = images[safeIndex];

  const goPrev = () =>
    setIndex((i) => {
      const clamped = Math.min(i, images.length - 1);
      return clamped > 0 ? clamped - 1 : images.length - 1;
    });

  const goNext = () =>
    setIndex((i) => {
      const clamped = Math.min(i, images.length - 1);
      return clamped < images.length - 1 ? clamped + 1 : 0;
    });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Source preview
        </label>
        <p className="text-[10px] text-muted-foreground/70 font-mono tabular-nums">
          {current.width} × {current.height} · {formatBytes(current.size)} ·{' '}
          {current.format.toUpperCase()}
        </p>
      </div>
      <PreviewNavigation
        currentIndex={safeIndex}
        total={images.length}
        onPrev={goPrev}
        onNext={goNext}
      >
        <div className="relative rounded-lg overflow-hidden bg-muted/30 border border-border/30 h-56 flex items-center justify-center">
          <img
            src={current.thumbnail}
            alt={current.name}
            className="max-w-full max-h-full object-contain"
          />
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-linear-to-t from-black/70 to-transparent">
            <p className="text-[10px] text-white font-medium truncate">{current.name}</p>
          </div>
        </div>
      </PreviewNavigation>
    </div>
  );
};

SourcePreview.displayName = 'SourcePreview';

export { SourcePreview };
