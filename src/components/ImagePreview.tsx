import { useReducer, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Columns2, Loader2 } from 'lucide-react';
import { debounce } from 'lodash-es';
import { cn } from '@/lib/utils';
import { fadeIn } from '@/lib/animations';
import { Button } from '@/components/ui/button';
import {
  type PreviewOptions,
  loadImageForPreview,
  applyAdjustments,
  hasAdjustments,
} from '@/lib/image-preview';

type ImagePreviewProps = {
  src: string;
  options: PreviewOptions;
  className?: string;
};

type ViewMode = 'adjusted' | 'original' | 'split';

type PreviewState = {
  viewMode: ViewMode;
  isProcessing: boolean;
  originalUrl: string;
  adjustedUrl: string;
  splitPosition: number;
  isDragging: boolean;
};

type PreviewAction =
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_ORIGINAL_URL'; payload: string }
  | { type: 'SET_ADJUSTED_URL'; payload: string }
  | { type: 'SET_URLS'; payload: { original: string; adjusted: string } }
  | { type: 'SET_SPLIT_POSITION'; payload: number }
  | { type: 'SET_DRAGGING'; payload: boolean };

const initialState: PreviewState = {
  viewMode: 'adjusted',
  isProcessing: false,
  originalUrl: '',
  adjustedUrl: '',
  splitPosition: 50,
  isDragging: false,
};

const previewReducer = (state: PreviewState, action: PreviewAction): PreviewState => {
  switch (action.type) {
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload };
    case 'SET_ORIGINAL_URL':
      return { ...state, originalUrl: action.payload };
    case 'SET_ADJUSTED_URL':
      return { ...state, adjustedUrl: action.payload };
    case 'SET_URLS':
      return { ...state, originalUrl: action.payload.original, adjustedUrl: action.payload.adjusted };
    case 'SET_SPLIT_POSITION':
      return { ...state, splitPosition: action.payload };
    case 'SET_DRAGGING':
      return { ...state, isDragging: action.payload };
    default:
      return state;
  }
};

const ImagePreview = ({ src, options, className }: ImagePreviewProps) => {
  const [state, dispatch] = useReducer(previewReducer, initialState);
  const { viewMode, isProcessing, originalUrl, adjustedUrl, splitPosition, isDragging } = state;

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
        const url = canvas.toDataURL('image/png');
        dispatch({ type: 'SET_URLS', payload: { original: url, adjusted: url } });
      } catch (error) {
        console.error('Failed to load image:', error);
      }
    };

    loadImage();

    return () => {
      mounted = false;
    };
  }, [src]);

  // Debounced adjustment processing function
  const processAdjustments = useMemo(
    () =>
      debounce((opts: PreviewOptions) => {
        if (!originalImageDataRef.current || !canvasRef.current || !ctxRef.current) return;
        if (processingRef.current) return;

        processingRef.current = true;
        dispatch({ type: 'SET_PROCESSING', payload: true });

        requestAnimationFrame(() => {
          try {
            const originalData = originalImageDataRef.current!;
            const freshData = new ImageData(
              new Uint8ClampedArray(originalData.data),
              originalData.width,
              originalData.height
            );

            const adjusted = applyAdjustments(freshData, opts);
            ctxRef.current!.putImageData(adjusted, 0, 0);
            dispatch({ type: 'SET_ADJUSTED_URL', payload: canvasRef.current!.toDataURL('image/png') });
          } catch (error) {
            console.error('Failed to apply adjustments:', error);
          } finally {
            dispatch({ type: 'SET_PROCESSING', payload: false });
            processingRef.current = false;
          }
        });
      }, 50, { leading: true, trailing: true }),
    []
  );

  // Apply adjustments when options change
  useEffect(() => {
    processAdjustments(options);
    return () => processAdjustments.cancel();
  }, [options, processAdjustments]);

  // Handle split view dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (viewMode !== 'split') return;
    dispatch({ type: 'SET_DRAGGING', payload: true });
    e.preventDefault();
  }, [viewMode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(10, Math.min(90, (x / rect.width) * 100));
    dispatch({ type: 'SET_SPLIT_POSITION', payload: percentage });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    dispatch({ type: 'SET_DRAGGING', payload: false });
  }, []);

  const handleMouseLeave = useCallback(() => {
    dispatch({ type: 'SET_DRAGGING', payload: false });
  }, []);

  const showAdjusted = hasAdjustments(options);
  const displayUrl = viewMode === 'original' ? originalUrl : adjustedUrl;

  return (
    <div className={cn('relative rounded-lg overflow-hidden bg-muted/30 flex flex-col', className)}>
      <div className="absolute top-2 right-2 z-20 flex gap-0.5 p-0.5 rounded-md bg-background/80 backdrop-blur-sm border border-border/30">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'adjusted' })}
          className={cn(
            'h-6 w-6 p-0',
            viewMode === 'adjusted' && 'bg-primary/10 text-primary'
          )}
          title="Show adjusted"
        >
          <Eye className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'original' })}
          className={cn(
            'h-6 w-6 p-0',
            viewMode === 'original' && 'bg-primary/10 text-primary'
          )}
          title="Show original"
        >
          <EyeOff className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'split' })}
          className={cn(
            'h-6 w-6 p-0',
            viewMode === 'split' && 'bg-primary/10 text-primary'
          )}
          title="Split comparison"
        >
          <Columns2 className="w-3 h-3" />
        </Button>
      </div>

      <AnimatePresence>
        {isProcessing && (
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm border border-border/30"
          >
            <Loader2 className="w-2.5 h-2.5 animate-spin text-primary" />
            <span className="text-[10px] text-muted-foreground">Processing</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 min-h-0 flex items-center justify-center p-3">
        {viewMode === 'split' ? (
          <div
            ref={containerRef}
            className="relative max-w-full max-h-full cursor-ew-resize select-none overflow-hidden rounded-md"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
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

            <img
              src={adjustedUrl}
              alt="Adjusted"
              className="max-w-full max-h-full object-contain"
              style={{ clipPath: `inset(0 0 0 ${splitPosition}%)` }}
              draggable={false}
            />

            <div
              className="absolute top-0 bottom-0 w-px bg-white/60 z-10 pointer-events-none"
              style={{ left: `${splitPosition}%`, transform: 'translateX(-50%)' }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center">
                <Columns2 className="w-3 h-3 text-muted-foreground" />
              </div>
            </div>

            <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-background/70 backdrop-blur-sm text-[9px] text-muted-foreground z-10">
              Original
            </div>
            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-background/70 backdrop-blur-sm text-[9px] text-muted-foreground z-10">
              Adjusted
            </div>
          </div>
        ) : (
          <div className="relative max-w-full max-h-full">
            <img
              src={displayUrl}
              alt={viewMode === 'original' ? 'Original' : 'Adjusted'}
              className="max-w-full max-h-full object-contain rounded-md"
            />
            {!showAdjusted && viewMode === 'adjusted' && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-md">
                <span className="text-xs text-muted-foreground">
                  Adjust sliders to see changes
                </span>
              </div>
            )}
            <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-background/70 backdrop-blur-sm text-[9px] text-muted-foreground">
              {viewMode === 'original' ? 'Original' : 'Preview'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

ImagePreview.displayName = 'ImagePreview';

export { ImagePreview, type PreviewOptions };
