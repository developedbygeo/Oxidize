import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, Loader2 } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { cn } from '@/lib/utils';
import { expandHeight } from '@/lib/animations';
import { Button } from '@/components/ui/button';
import type { ImageInfo } from '@/types/image';

type ImageDropzoneProps = {
  images: ImageInfo[];
  onImagesChange: (images: ImageInfo[]) => void;
  maxImages?: number;
  compact?: boolean;
  className?: string;
};

const ImageDropzone = ({
  images,
  onImagesChange,
  maxImages = 50,
  compact = false,
  className,
}: ImageDropzoneProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleSelectFiles = useCallback(async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: 'Images',
            extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'ico', 'tiff', 'tif'],
          },
        ],
      });

      if (!selected || (Array.isArray(selected) && selected.length === 0)) return;

      const paths = Array.isArray(selected) ? selected : [selected];

      if (images.length + paths.length > maxImages) {
        // Could show a toast here
        console.warn(`Maximum ${maxImages} images allowed`);
        return;
      }

      setIsLoading(true);

      type RustResult = { Ok: ImageInfo } | { Err: string } | ImageInfo;
      const results = await invoke<RustResult[]>('load_images_batch', {
        paths,
      });

      const processedImages = results
        .map((r) => {
          if (typeof r === 'object' && r !== null) {
            if ('Ok' in r) return r.Ok;
            if ('path' in r) return r as ImageInfo;
          }
          return null;
        })
        .filter((img): img is ImageInfo => img !== null);

      onImagesChange([...images, ...processedImages]);
    } catch (error) {
      console.error('Failed to load images:', error);
    } finally {
      setIsLoading(false);
    }
  }, [images, onImagesChange, maxImages]);

  const handleRemoveImage = useCallback(
    (index: number) => {
      onImagesChange(images.filter((_, i) => i !== index));
    },
    [images, onImagesChange]
  );

  const handleClearAll = useCallback(() => {
    onImagesChange([]);
  }, [onImagesChange]);

  if (compact) {
    return (
      <button
        onClick={handleSelectFiles}
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
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div
        onClick={handleSelectFiles}
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
              <Upload className="w-5 h-5 text-primary" />
            </div>
          )}
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {isLoading ? 'Loading...' : 'Drop images here'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              or click to browse
            </p>
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
                onClick={handleClearAll}
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
                    <p className="text-[9px] text-white font-medium truncate">
                      {image.name}
                    </p>
                    <p className="text-[8px] text-white/70">
                      {image.width}×{image.height}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage(index);
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
