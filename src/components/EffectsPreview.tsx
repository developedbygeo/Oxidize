import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Columns2, Loader2 } from 'lucide-react';
import { debounce } from 'lodash-es';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  type EffectPreviewOptions,
  loadImageForPreview,
  applyEffect,
  hasEffect,
} from '@/lib/image-preview';

interface EffectsPreviewProps {
  src: string;
  options: EffectPreviewOptions;
  className?: string;
}

type ViewMode = 'adjusted' | 'original' | 'split';

const EffectsPreview = ({ src, options, className }: EffectsPreviewProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('adjusted');
  const [isProcessing, setIsProcessing] = useState(false);
  const [originalUrl, setOriginalUrl] = useState<string>('');
  const [adjustedUrl, setAdjustedUrl] = useState<string>('');
  const [splitPosition, setSplitPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const originalImageDataRef = useRef<ImageData | null>(null);
  const processingRef = useRef<boolean>(false);

  // Load original image once
  useEffect(() => {
    let mounted = true;

    const loadImage = async () => {
      try {
        const { imageData, canvas, ctx } = await loadImageForPreview(src);
        if (!mounted) return;

        canvasRef.current = canvas;
        ctxRef.current = ctx;
        originalImageDataRef.current = new ImageData(
          new Uint8ClampedArray(imageData.data),
          imageData.width,
          imageData.height
        );
        setOriginalUrl(canvas.toDataURL('image/png'));
        setAdjustedUrl(canvas.toDataURL('image/png'));
      } catch (error) {
        console.error('Failed to load image:', error);
      }
    };

    loadImage();

    return () => {
      mounted = false;
    };
  }, [src]);

  // Debounced effect processing function
  const processEffect = useMemo(
    () =>
      debounce((opts: EffectPreviewOptions) => {
        if (!originalImageDataRef.current || !canvasRef.current || !ctxRef.current) return;
        if (processingRef.current) return;

        processingRef.current = true;
        setIsProcessing(true);

        requestAnimationFrame(() => {
          try {
            const originalData = originalImageDataRef.current!;
            const freshData = new ImageData(
              new Uint8ClampedArray(originalData.data),
              originalData.width,
              originalData.height
            );

            const adjusted = applyEffect(freshData, opts);
            ctxRef.current!.putImageData(adjusted, 0, 0);
            setAdjustedUrl(canvasRef.current!.toDataURL('image/png'));
          } catch (error) {
            console.error('Failed to apply effect:', error);
          } finally {
            setIsProcessing(false);
            processingRef.current = false;
          }
        });
      }, 50, { leading: true, trailing: true }),
    []
  );

  // Apply effect when options change
  useEffect(() => {
    processEffect(options);
    return () => processEffect.cancel();
  }, [options, processEffect]);

  // Handle split view dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (viewMode !== 'split') return;
    setIsDragging(true);
    e.preventDefault();
  }, [viewMode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(10, Math.min(90, (x / rect.width) * 100));
    setSplitPosition(percentage);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const showAdjusted = hasEffect(options);
  const displayUrl = viewMode === 'original' ? originalUrl : adjustedUrl;

  return (
    <div className={cn('relative rounded-xl overflow-hidden bg-muted/50 flex flex-col', className)}>
      {/* View mode toggle */}
      <div className="absolute top-3 right-3 z-20 flex gap-1 p-1 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setViewMode('adjusted')}
          className={cn(
            'h-7 px-2 text-xs',
            viewMode === 'adjusted' && 'bg-violet-500/20 text-violet-500'
          )}
          title="Show with effect"
        >
          <Eye className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setViewMode('original')}
          className={cn(
            'h-7 px-2 text-xs',
            viewMode === 'original' && 'bg-violet-500/20 text-violet-500'
          )}
          title="Show original"
        >
          <EyeOff className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setViewMode('split')}
          className={cn(
            'h-7 px-2 text-xs',
            viewMode === 'split' && 'bg-violet-500/20 text-violet-500'
          )}
          title="Split comparison"
        >
          <Columns2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Processing indicator */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-3 left-3 z-20 flex items-center gap-2 px-2 py-1 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50"
          >
            <Loader2 className="w-3 h-3 animate-spin text-violet-500" />
            <span className="text-xs text-muted-foreground">Processing...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image display - fills available space */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-4">
        {viewMode === 'split' ? (
          <div
            ref={containerRef}
            className="relative max-w-full max-h-full cursor-ew-resize select-none overflow-hidden rounded-lg"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            {/* Original (left side) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - splitPosition}% 0 0)` }}
            >
              <img
                src={originalUrl}
                alt="Original"
                className="max-w-full max-h-full object-contain"
                draggable={false}
              />
            </div>

            {/* Adjusted (right side) - this one sets the size */}
            <img
              src={adjustedUrl}
              alt="With Effect"
              className="max-w-full max-h-full object-contain"
              style={{ clipPath: `inset(0 0 0 ${splitPosition}%)` }}
              draggable={false}
            />

            {/* Split line - contained within bounds */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white/80 z-10 pointer-events-none"
              style={{ left: `${splitPosition}%`, transform: 'translateX(-50%)' }}
            >
              {/* Handle circle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center border border-border/30">
                <Columns2 className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            {/* Labels */}
            <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-background/80 backdrop-blur-sm text-xs text-muted-foreground z-10">
              Original
            </div>
            <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-background/80 backdrop-blur-sm text-xs text-muted-foreground z-10">
              Effect
            </div>
          </div>
        ) : (
          <div className="relative max-w-full max-h-full">
            <img
              src={displayUrl}
              alt={viewMode === 'original' ? 'Original' : 'With Effect'}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            {!showAdjusted && viewMode === 'adjusted' && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
                <span className="text-sm text-muted-foreground">
                  Adjust intensity to see changes
                </span>
              </div>
            )}
            {/* View mode label */}
            <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-background/80 backdrop-blur-sm text-xs text-muted-foreground">
              {viewMode === 'original' ? 'Original' : 'Preview'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

EffectsPreview.displayName = 'EffectsPreview';

export { EffectsPreview, type EffectPreviewOptions };
