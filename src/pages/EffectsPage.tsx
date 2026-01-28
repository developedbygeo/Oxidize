import { useReducer, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wand2, Check, Loader2, FolderOpen, X, ExternalLink } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { toast } from 'sonner';
import { cn, resolveOutputDir } from '@/lib/utils';
import { createProcessToast } from '@/lib/process-toast';
import { fadeIn, fadeUp } from '@/lib/animations';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ImageDropzone } from '@/components/ImageDropzone';
import { EffectsPreview, type EffectPreviewOptions } from '@/components/EffectsPreview';
import type { ImageInfo, EffectType, EffectResult, OperationHistoryItem } from '@/types/image';
import { effectsList as effects } from '@/types/image';

type EffectsPageProps = {
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

type EffectsState = {
  images: ImageInfo[];
  selectedEffect: EffectType;
  intensity: number;
  outputDir: string | null;
  isProcessing: boolean;
  results: EffectResult[];
  showResults: boolean;
  previewIndex: number;
  previewSrc: string;
  isLoadingPreview: boolean;
};

type EffectsAction =
  | { type: 'SET_IMAGES'; payload: ImageInfo[] }
  | { type: 'SET_SELECTED_EFFECT'; payload: EffectType }
  | { type: 'SET_INTENSITY'; payload: number }
  | { type: 'SET_OUTPUT_DIR'; payload: string | null }
  | { type: 'START_PROCESSING' }
  | { type: 'FINISH_PROCESSING'; payload: EffectResult[] }
  | { type: 'SET_PREVIEW_INDEX'; payload: number }
  | { type: 'SET_PREVIEW_SRC'; payload: string }
  | { type: 'SET_LOADING_PREVIEW'; payload: boolean }
  | { type: 'REMOVE_IMAGE'; payload: number };

const initialState: EffectsState = {
  images: [],
  selectedEffect: 'grayscale',
  intensity: 50,
  outputDir: null,
  isProcessing: false,
  results: [],
  showResults: false,
  previewIndex: 0,
  previewSrc: '',
  isLoadingPreview: false,
};

const effectsReducer = (state: EffectsState, action: EffectsAction): EffectsState => {
  switch (action.type) {
    case 'SET_IMAGES':
      return { ...state, images: action.payload };
    case 'SET_SELECTED_EFFECT':
      return { ...state, selectedEffect: action.payload };
    case 'SET_INTENSITY':
      return { ...state, intensity: action.payload };
    case 'SET_OUTPUT_DIR':
      return { ...state, outputDir: action.payload };
    case 'START_PROCESSING':
      return { ...state, isProcessing: true, showResults: false };
    case 'FINISH_PROCESSING':
      return { ...state, isProcessing: false, results: action.payload, showResults: true };
    case 'SET_PREVIEW_INDEX':
      return { ...state, previewIndex: action.payload };
    case 'SET_PREVIEW_SRC':
      return { ...state, previewSrc: action.payload };
    case 'SET_LOADING_PREVIEW':
      return { ...state, isLoadingPreview: action.payload };
    case 'REMOVE_IMAGE': {
      const newImages = state.images.filter((_, i) => i !== action.payload);
      const newPreviewIndex =
        state.previewIndex >= newImages.length ? Math.max(0, newImages.length - 1) : state.previewIndex;
      return { ...state, images: newImages, previewIndex: newPreviewIndex };
    }
    default:
      return state;
  }
};

const EffectsPage = ({ onOperationComplete }: EffectsPageProps) => {
  const [state, dispatch] = useReducer(effectsReducer, initialState);
  const {
    images,
    selectedEffect,
    intensity,
    outputDir,
    isProcessing,
    results,
    showResults,
    previewIndex,
    previewSrc,
    isLoadingPreview,
  } = state;

  const previewOptions = useMemo<EffectPreviewOptions>(
    () => ({
      effect: selectedEffect,
      intensity,
    }),
    [selectedEffect, intensity]
  );

  const previewImage = images[previewIndex];

  useEffect(() => {
    if (!previewImage) {
      dispatch({ type: 'SET_PREVIEW_SRC', payload: '' });
      return;
    }

    let cancelled = false;
    dispatch({ type: 'SET_LOADING_PREVIEW', payload: true });

    invoke<string>('get_image_preview', {
      path: previewImage.path,
      maxDimension: 800,
    })
      .then((src) => {
        if (!cancelled) {
          dispatch({ type: 'SET_PREVIEW_SRC', payload: src });
        }
      })
      .catch((error) => {
        console.error('Failed to load preview:', error);
        if (!cancelled) {
          dispatch({ type: 'SET_PREVIEW_SRC', payload: previewImage.thumbnail });
        }
      })
      .finally(() => {
        if (!cancelled) {
          dispatch({ type: 'SET_LOADING_PREVIEW', payload: false });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [previewImage]);

  const handleSelectOutputDir = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
    });
    if (selected) {
      dispatch({ type: 'SET_OUTPUT_DIR', payload: selected as string });
    }
  };

  const handleApplyEffect = async () => {
    if (images.length === 0) return;

    const effectInfo = effects.find((e) => e.type === selectedEffect);
    dispatch({ type: 'START_PROCESSING' });
    const processToast = createProcessToast({
      action: effectInfo?.label || selectedEffect,
      itemCount: images.length,
    });

    try {
      const paths = images.map((img) => img.path);
      const options = {
        effect: selectedEffect,
        intensity,
        output_dir: outputDir,
      };

      const effectResults = await invoke<EffectResult[]>('apply_image_effects_batch', {
        inputPaths: paths,
        options,
      });

      dispatch({ type: 'FINISH_PROCESSING', payload: effectResults });

      const successCount = effectResults.filter((r) => r.success).length;
      const failCount = effectResults.length - successCount;

      processToast.finish({ successCount, failCount });

      if (successCount > 0 && onOperationComplete) {
        const dir = resolveOutputDir({
          results: effectResults.filter((r) => r.success),
          fallbackDir: outputDir,
          fallbackPath: images[0]?.path,
        });

        onOperationComplete({
          type: 'effects',
          fileCount: successCount,
          outputDir: dir,
          details: `${effectInfo?.label || selectedEffect} @ ${intensity}%`,
        });
      }
    } catch (error) {
      console.error('Effect application failed:', error);
      processToast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
      dispatch({ type: 'FINISH_PROCESSING', payload: [] });
    }
  };

  const successCount = results.filter((r) => r.success).length;
  const selectedEffectInfo = effects.find((e) => e.type === selectedEffect);

  if (images.length === 0) {
    return (
      <div className="h-full overflow-auto">
        <div className="max-w-3xl mx-auto p-6 space-y-5">
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="flex items-center gap-3"
          >
            <div className="p-2 rounded-lg bg-primary/10">
              <Wand2 className="w-4 h-4 text-primary" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Effects</h1>
              <p className="text-xs text-muted-foreground">
                Transform images with visual effects
              </p>
            </div>
          </motion.div>

          <ImageDropzone
            images={images}
            onImagesChange={(newImages) => {
              dispatch({ type: 'SET_IMAGES', payload: newImages });
              dispatch({ type: 'SET_PREVIEW_INDEX', payload: 0 });
            }}
          />

          <div className="grid grid-cols-5 gap-1.5">
            {effects.map((effect) => (
              <div
                key={effect.type}
                className="p-2.5 rounded-md bg-muted/30 border border-border/30 text-center"
              >
                <span className="block text-base mb-0.5">{effect.icon}</span>
                <span className="block text-[10px] font-medium text-foreground">{effect.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 border-r border-border/50">
          <div className="flex-1 min-h-0 relative">
            {isLoadingPreview && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            )}
            {previewImage && previewSrc && (
              <EffectsPreview
                key={previewImage.path}
                src={previewSrc}
                options={previewOptions}
                className="h-full w-full"
              />
            )}
          </div>

          <div className="border-t border-border/50 p-2.5 bg-muted/20">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {images.map((img, index) => (
                <button
                  key={img.path}
                  onClick={() => dispatch({ type: 'SET_PREVIEW_INDEX', payload: index })}
                  className={cn(
                    'relative shrink-0 w-12 h-12 rounded-md overflow-hidden border transition-all group',
                    previewIndex === index
                      ? 'border-primary ring-1 ring-primary/30'
                      : 'border-border/50 hover:border-primary/50'
                  )}
                >
                  <img src={img.thumbnail} alt={img.name} className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({ type: 'REMOVE_IMAGE', payload: index });
                    }}
                    className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </button>
              ))}
              <ImageDropzone
                images={images}
                onImagesChange={(newImages) => dispatch({ type: 'SET_IMAGES', payload: newImages })}
                compact
                className="shrink-0 w-12 h-12"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
              {images.length} image{images.length !== 1 ? 's' : ''}
              {previewImage && ` · ${previewImage.name}`}
            </p>
          </div>
        </div>

        <div className="w-72 flex flex-col bg-background overflow-hidden shrink-0">
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <div className="space-y-2">
              <h2 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Select Effect
              </h2>
              <div className="grid grid-cols-2 gap-1">
                {effects.map((effect) => (
                  <button
                    key={effect.type}
                    onClick={() => dispatch({ type: 'SET_SELECTED_EFFECT', payload: effect.type })}
                    className={cn(
                      'p-2 rounded-md text-left transition-colors',
                      selectedEffect === effect.type
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted/30 hover:bg-muted/50'
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{effect.icon}</span>
                      <span
                        className={cn(
                          'text-[11px] font-medium',
                          selectedEffect === effect.type ? '' : 'text-foreground'
                        )}
                      >
                        {effect.label}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Intensity</h2>
              <div className="p-2.5 rounded-md bg-muted/20 border border-border/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Effect strength</span>
                  <span className="text-[10px] font-mono tabular-nums text-primary">{intensity}%</span>
                </div>
                <Slider
                  value={[intensity]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(values) => dispatch({ type: 'SET_INTENSITY', payload: values[0] })}
                  className="**:data-[slot=slider-track]:h-1 **:data-[slot=slider-range]:bg-primary **:data-[slot=slider-thumb]:border-primary **:data-[slot=slider-thumb]:size-3"
                />
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>Subtle</span>
                  <span>Strong</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Output</label>
              <Button
                variant="outline"
                onClick={handleSelectOutputDir}
                className="w-full justify-start gap-1.5 h-8 text-[11px]"
              >
                <FolderOpen className="w-3 h-3 text-muted-foreground" />
                <span className="truncate text-left flex-1">{outputDir || 'Same as original'}</span>
              </Button>
            </div>

            <AnimatePresence>
              {showResults && results.length > 0 && (
                <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-1.5"
                >
                  <div className="p-2 rounded-md bg-primary/5 border border-primary/10">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-primary/10">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-foreground">Complete</p>
                        <p className="text-[9px] text-muted-foreground">
                          {successCount}/{results.length} processed
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-0.5 max-h-24 overflow-y-auto">
                    {results.map((result, index) => (
                      <button
                        key={index}
                        onClick={async () => {
                          if (result.success && result.output_path) {
                            try {
                              await invoke('reveal_file', { path: result.output_path });
                            } catch {
                              toast.error('File not found', {
                                description: 'The output file may have been moved or deleted.',
                              });
                            }
                          }
                        }}
                        disabled={!result.success || !result.output_path}
                        className={cn(
                          'w-full flex items-center justify-between p-1.5 rounded text-[10px] transition-colors',
                          result.success
                            ? 'bg-muted/30 hover:bg-muted/50 cursor-pointer'
                            : 'bg-destructive/5 cursor-default'
                        )}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div
                            className={cn(
                              'w-1 h-1 rounded-full shrink-0',
                              result.success ? 'bg-primary' : 'bg-destructive'
                            )}
                          />
                          <span className="truncate">
                            {result.output_path?.split(/[/\\]/).pop() || `Image ${index + 1}`}
                          </span>
                        </div>
                        {result.success && (
                          <ExternalLink className="w-2.5 h-2.5 text-muted-foreground ml-1" />
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="p-3 border-t border-border/30 bg-background">
            <Button
              onClick={handleApplyEffect}
              disabled={isProcessing || images.length === 0}
              className="w-full h-9 text-xs gap-1.5"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" />
                  Apply {selectedEffectInfo?.label}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

EffectsPage.displayName = 'EffectsPage';

export { EffectsPage };
