import { Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ImageInfo } from '@/types/image';
import { useImageDropzone } from './useImageDropzone';

type ImageDropzoneCompactProps = {
  images: ImageInfo[];
  onImagesChange: (images: ImageInfo[]) => void;
  maxImages?: number;
  className?: string;
};

const ImageDropzoneCompact = ({
  images,
  onImagesChange,
  maxImages = 50,
  className,
}: ImageDropzoneCompactProps) => {
  const { isLoading, selectFiles } = useImageDropzone({ images, onImagesChange, maxImages });

  return (
    <button
      onClick={selectFiles}
      disabled={isLoading}
      className={cn(
        'flex items-center justify-center rounded-md border border-dashed border-border/50 bg-muted/20',
        'hover:border-primary/50 hover:bg-primary/5 transition-colors',
        isLoading && 'pointer-events-none opacity-70',
        className
      )}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
      ) : (
        <Upload className="w-3.5 h-3.5 text-muted-foreground" />
      )}
    </button>
  );
};

ImageDropzoneCompact.displayName = 'ImageDropzoneCompact';

export { ImageDropzoneCompact };
