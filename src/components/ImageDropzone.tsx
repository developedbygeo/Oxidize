import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, Loader2 } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { ImageInfo } from '@/types/image';

interface ImageDropzoneProps {
  images: ImageInfo[];
  onImagesChange: (images: ImageInfo[]) => void;
  maxImages?: number;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const ImageDropzone = ({
  images,
  onImagesChange,
  maxImages = 50,
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

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        onClick={handleSelectFiles}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          // File drop handling would need Tauri's drag-drop plugin
        }}
        className={cn(
          'group relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 cursor-pointer',
          'hover:border-primary/60 hover:bg-primary/5',
          isDragOver && 'border-primary bg-primary/10 scale-[1.02]',
          isLoading && 'pointer-events-none opacity-70',
          'border-border/50 bg-muted/30'
        )}
      >
        <div className="flex flex-col items-center gap-3">
          {isLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 className="w-10 h-10 text-primary" />
            </motion.div>
          ) : (
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="p-4 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors"
            >
              <Upload className="w-8 h-8 text-primary" />
            </motion.div>
          )}
          <div className="text-center">
            <p className="font-medium text-foreground">
              {isLoading ? 'Loading images...' : 'Drop images here'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            PNG, JPG, WebP, GIF, BMP, ICO, TIFF
          </p>
        </div>
      </motion.div>

      {/* Image List */}
      <AnimatePresence mode="popLayout">
        {images.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                {images.length} image{images.length !== 1 ? 's' : ''} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-muted-foreground hover:text-destructive"
              >
                Clear all
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-75 overflow-y-auto p-1">
              {images.map((image, index) => (
                <motion.div
                  key={image.path}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-muted border border-border/50"
                >
                  <img
                    src={image.thumbnail}
                    alt={image.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-white font-medium truncate">
                      {image.name}
                    </p>
                    <p className="text-[10px] text-white/70">
                      {image.width}×{image.height} • {formatFileSize(image.size)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage(index);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-destructive transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-black/50 text-white uppercase">
                    {image.format}
                  </div>
                </motion.div>
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
