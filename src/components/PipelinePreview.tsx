import { useReducer, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { debounce } from 'lodash-es';
import { cn } from '@/lib/utils';
import { fadeIn } from '@/lib/animations';
import {
  type PreviewOptions,
  type EffectPreviewOptions,
  loadImageForPreview,
  applyAdjustments,
  applyEffect,
} from '@/lib/image-preview';

export type PipelinePreviewStep =
  | { kind: 'beautify'; options: PreviewOptions }
  | { kind: 'effects'; options: EffectPreviewOptions };

type PipelinePreviewProps = {
  src: string;
  steps: PipelinePreviewStep[];
  className?: string;
};

type PreviewState = {
  isProcessing: boolean;
  previewUrl: string;
};

type PreviewAction =
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_PREVIEW_URL'; payload: string };

const initialState: PreviewState = {
  isProcessing: false,
  previewUrl: '',
};

const previewReducer = (state: PreviewState, action: PreviewAction): PreviewState => {
  switch (action.type) {
    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload };
    case 'SET_PREVIEW_URL':
      return { ...state, previewUrl: action.payload };
    default:
      return state;
  }
};

const applyStep = (data: ImageData, step: PipelinePreviewStep): ImageData => {
  switch (step.kind) {
    case 'beautify':
      return applyAdjustments(data, step.options);
    case 'effects':
      return applyEffect(data, step.options);
  }
};

const PipelinePreview = ({ src, steps, className }: PipelinePreviewProps) => {
  const [state, dispatch] = useReducer(previewReducer, initialState);
  const { isProcessing, previewUrl } = state;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const originalImageDataRef = useRef<ImageData | null>(null);
  const processingRef = useRef<boolean>(false);

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
        dispatch({ type: 'SET_PREVIEW_URL', payload: canvas.toDataURL('image/png') });
      } catch (error) {
        console.error('Failed to load image:', error);
      }
    };

    loadImage();

    return () => {
      mounted = false;
    };
  }, [src]);

  const processPipeline = useMemo(
    () =>
      debounce(
        (pipelineSteps: PipelinePreviewStep[]) => {
          if (!originalImageDataRef.current || !canvasRef.current || !ctxRef.current) return;
          if (processingRef.current) return;

          processingRef.current = true;
          dispatch({ type: 'SET_PROCESSING', payload: true });

          requestAnimationFrame(() => {
            try {
              const originalData = originalImageDataRef.current!;
              let processedData = new ImageData(
                new Uint8ClampedArray(originalData.data),
                originalData.width,
                originalData.height
              );

              for (const step of pipelineSteps) {
                processedData = applyStep(processedData, step);
              }

              ctxRef.current!.putImageData(processedData, 0, 0);
              dispatch({
                type: 'SET_PREVIEW_URL',
                payload: canvasRef.current!.toDataURL('image/png'),
              });
            } catch (error) {
              console.error('Failed to process pipeline:', error);
            } finally {
              dispatch({ type: 'SET_PROCESSING', payload: false });
              processingRef.current = false;
            }
          });
        },
        100,
        { leading: true, trailing: true }
      ),
    []
  );

  useEffect(() => {
    processPipeline(steps);
    return () => processPipeline.cancel();
  }, [steps, processPipeline]);

  const hasSteps = steps.length > 0;

  return (
    <div className={cn('relative rounded-xl overflow-hidden bg-muted/50 flex flex-col', className)}>
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute top-3 left-3 z-20 flex items-center gap-2 px-2 py-1 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50"
          >
            <Loader2 className="w-3 h-3 text-primary animate-spin" />
            <span className="text-xs text-muted-foreground">Processing...</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 min-h-0 flex items-center justify-center p-4">
        <div className="relative max-w-full max-h-full">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Pipeline Preview"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
            </div>
          )}
          {!hasSteps && previewUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
              <span className="text-sm text-muted-foreground">
                Enable operations to see preview
              </span>
            </div>
          )}
          <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-background/80 backdrop-blur-sm text-xs text-muted-foreground">
            {hasSteps ? 'Pipeline Preview' : 'Original'}
          </div>
        </div>
      </div>
    </div>
  );
};

PipelinePreview.displayName = 'PipelinePreview';

export { PipelinePreview };
