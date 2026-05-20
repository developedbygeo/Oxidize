import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageDropzone } from '@/components/ImageDropzone';
import type { ImageInfo } from '@/types/image';

type ThumbnailStripProps = {
  images: ImageInfo[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
  onImagesChange: (images: ImageInfo[]) => void;
  footer?: React.ReactNode;
};

const ThumbnailStrip = ({
  images,
  selectedIndex,
  onSelect,
  onRemove,
  onImagesChange,
  footer,
}: ThumbnailStripProps) => (
  <div className="border-t border-border/50 p-2.5 bg-muted/20">
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {images.map((img, index) => (
        <button
          key={img.path}
          onClick={() => onSelect(index)}
          className={cn(
            'relative shrink-0 w-12 h-12 rounded-md overflow-hidden border transition-all group',
            selectedIndex === index
              ? 'border-primary ring-1 ring-primary/30'
              : 'border-border/50 hover:border-primary/50'
          )}
        >
          <img src={img.thumbnail} alt={img.name} className="w-full h-full object-cover" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(index);
            }}
            className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </button>
      ))}
      <ImageDropzone
        images={images}
        onImagesChange={onImagesChange}
        compact
        className="shrink-0 w-12 h-12"
      />
    </div>
    {footer && <p className="text-[10px] text-muted-foreground mt-1.5 text-center">{footer}</p>}
  </div>
);

ThumbnailStrip.displayName = 'ThumbnailStrip';

export { ThumbnailStrip };
