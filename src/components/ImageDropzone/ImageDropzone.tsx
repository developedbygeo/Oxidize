import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { expandHeight } from '@/lib/animations';
import { Button } from '@/components/ui/button';
import type { ImageInfo } from '@/types/image';
import { useImageDropzone } from './useImageDropzone';

type ImageDropzoneProps = {
  images: ImageInfo[];
  onImagesChange: (images: ImageInfo[]) => void;
  maxImages?: number;
  className?: string;
};

const ImageDropzone = ({
  images,
  onImagesChange,
  maxImages = 50,
  className,
}: ImageDropzoneProps) => {
  const { isLoading, isOsDragOver, selectFiles, removeImage, clearAll } = useImageDropzone({
    images,
    onImagesChange,
    maxImages,
  });
  const [isHtmlDragOver, setIsHtmlDragOver] = useState(false);
  const isDragOver = isHtmlDragOver || isOsDragOver;

  return (
    <div className={cn('space-y-3', className)}>
      <div
        onClick={selectFiles}
        onDragOver={(e) => {
          e.preventDefault();
          setIsHtmlDragOver(true);
        }}
        onDragLeave={() => setIsHtmlDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsHtmlDragOver(false);
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
              <Upload className="w-5 h-5 text-primary" />
            </div>
          )}
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {isLoading ? 'Loading...' : 'Drop images here'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">or click to browse</p>
          </div>
          <p className="text-[10px] text-muted-foreground">
            PNG, JPG, WebP, GIF, BMP, ICO, TIFF
          </p>
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {images.length > 0 && (
          <motion.div
            variants={expandHeight}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">
                {images.length} image{images.length !== 1 ? 's' : ''}
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

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 max-h-60 overflow-y-auto">
              {images.map((image, index) => (
                <div
                  key={image.path}
                  className="group relative aspect-square rounded-md overflow-hidden bg-muted border border-border/30"
                >
                  <img
                    src={image.thumbnail}
                    alt={image.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[9px] text-white font-medium truncate">{image.name}</p>
                    <p className="text-[8px] text-white/70">
                      {image.width}×{image.height}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(index);
                    }}
                    className="absolute top-1 right-1 p-1 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-destructive transition-all"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                  <div className="absolute top-1 left-1 px-1 py-0.5 rounded text-[8px] font-medium bg-black/50 text-white uppercase">
                    {image.format}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

ImageDropzone.displayName = 'ImageDropzone';

export { ImageDropzone };
