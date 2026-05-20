import { useReducer, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Check,
  Loader2,
  FolderOpen,
  Sun,
  Contrast,
  Droplets,
  Focus,
  Aperture,
  Palette,
  Thermometer,
  CircleDot,
  RotateCcw,
  X,
  ExternalLink,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { toast } from 'sonner';
import { cn, resolveOutputDir, formatAdjustmentDetails } from '@/lib/utils';
import { createProcessToast } from '@/lib/process-toast';
import { fadeIn, fadeUp } from '@/lib/animations';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ImageDropzone } from '@/components/ImageDropzone';
import { ImagePreview, type PreviewOptions } from '@/components/ImagePreview';
import type {
  ImageInfo,
  BeautifyOptions,
  BeautifyResult,
  WhiteBalancePreset,
  OperationHistoryItem,
} from '@/types/image';

type BeautifyPageProps = {
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

type AdjustmentSliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  icon: React.ReactNode;
  unit?: string;
};

const AdjustmentSlider = ({ label, value, min, max, onChange, icon, unit = '' }: AdjustmentSliderProps) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[11px] font-medium text-foreground">{label}</span>
      </div>
      <span
        className={cn(
          'text-[10px] font-mono tabular-nums',
          value === 0 ? 'text-muted-foreground' : 'text-primary'
        )}
      >
        {value > 0 ? '+' : ''}
        {value}
        {unit}
      </span>
    </div>
    <Slider
      value={[value]}
      min={min}
      max={max}
      step={1}
      onValueChange={(values) => onChange(values[0])}
      className="**:data-[slot=slider-track]:h-1 **:data-[slot=slider-range]:bg-primary **:data-[slot=slider-thumb]:border-primary **:data-[slot=slider-thumb]:size-3"
    />
  </div>
);

const whiteBalancePresets: { value: WhiteBalancePreset; label: string; icon: string }[] = [
  { value: 'auto', label: 'Auto', icon: '🔄' },
  { value: 'daylight', label: 'Day', icon: '☀️' },
  { value: 'cloudy', label: 'Cloud', icon: '☁️' },
  { value: 'tungsten', label: 'Bulb', icon: '💡' },
  { value: 'fluorescent', label: 'Fluo', icon: '🔦' },
];

type Adjustments = {
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
  exposure: number;
  hue_shift: number;
  temperature: number;
  white_balance: WhiteBalancePreset;
};

const defaultAdjustments: Adjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  sharpness: 0,
  exposure: 0,
  hue_shift: 0,
  temperature: 0,
  white_balance: 'daylight',
};

type BeautifyState = {
  images: ImageInfo[];
  adjustments: Adjustments;
  outputDir: string | null;
  isBeautifying: boolean;
  results: BeautifyResult[];
  showResults: boolean;
  previewIndex: number;
  previewSrc: string;
  isLoadingPreview: boolean;
};

type BeautifyAction =
  | { type: 'SET_IMAGES'; payload: ImageInfo[] }
  | { type: 'SET_ADJUSTMENT'; payload: Partial<Adjustments> }
  | { type: 'RESET_ADJUSTMENTS' }
  | { type: 'SET_OUTPUT_DIR'; payload: string | null }
  | { type: 'START_BEAUTIFYING' }
  | { type: 'FINISH_BEAUTIFYING'; payload: BeautifyResult[] }
  | { type: 'SET_PREVIEW_INDEX'; payload: number }
  | { type: 'SET_PREVIEW_SRC'; payload: string }
  | { type: 'SET_LOADING_PREVIEW'; payload: boolean }
  | { type: 'REMOVE_IMAGE'; payload: number };

const initialState: BeautifyState = {
  images: [],
  adjustments: defaultAdjustments,
  outputDir: null,
  isBeautifying: false,
  results: [],
  showResults: false,
  previewIndex: 0,
  previewSrc: '',
  isLoadingPreview: false,
};

const beautifyReducer = (state: BeautifyState, action: BeautifyAction): BeautifyState => {
  switch (action.type) {
    case 'SET_IMAGES':
      return { ...state, images: action.payload };
    case 'SET_ADJUSTMENT':
      return { ...state, adjustments: { ...state.adjustments, ...action.payload } };
    case 'RESET_ADJUSTMENTS':
      return { ...state, adjustments: defaultAdjustments };
    case 'SET_OUTPUT_DIR':
      return { ...state, outputDir: action.payload };
    case 'START_BEAUTIFYING':
      return { ...state, isBeautifying: true, showResults: false };
    case 'FINISH_BEAUTIFYING':
      return { ...state, isBeautifying: false, results: action.payload, showResults: true };
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

const BeautifyPage = ({ onOperationComplete }: BeautifyPageProps) => {
  const [state, dispatch] = useReducer(beautifyReducer, initialState);
  const {
    images,
    adjustments,
    outputDir,
    isBeautifying,
    results,
    showResults,
    previewIndex,
    previewSrc,
    isLoadingPreview,
  } = state;

  const previewOptions = useMemo<PreviewOptions>(
    () => ({
      brightness: adjustments.brightness,
      contrast: adjustments.contrast,
      saturation: adjustments.saturation,
      sharpness: adjustments.sharpness,
      exposure: adjustments.exposure,
      hueShift: adjustments.hue_shift,
      temperature: adjustments.temperature,
      whiteBalance: adjustments.white_balance,
    }),
    [adjustments]
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

  const hasChanges = Object.entries(adjustments).some(([key, value]) => {
    if (key === 'white_balance') return value !== 'daylight';
    return value !== 0;
  });

  const handleBeautify = async () => {
    if (images.length === 0) return;

    dispatch({ type: 'START_BEAUTIFYING' });
    const processToast = createProcessToast({ action: 'Beautification', itemCount: images.length });

    try {
      const paths = images.map((img) => img.path);
      const options: BeautifyOptions = {
        ...adjustments,
        output_dir: outputDir,
      };

      const beautifyResults = await invoke<BeautifyResult[]>('beautify_images_batch', {
        inputPaths: paths,
        options,
      });

      dispatch({ type: 'FINISH_BEAUTIFYING', payload: beautifyResults });

      const successCount = beautifyResults.filter((r) => r.success).length;
      const failCount = beautifyResults.length - successCount;

      processToast.finish({ successCount, failCount });

      if (successCount > 0 && onOperationComplete) {
        const dir = resolveOutputDir({
          results: beautifyResults.filter((r) => r.success),
          fallbackDir: outputDir,
          fallbackPath: images[0]?.path,
        });

        const details = formatAdjustmentDetails([
          { label: 'Brightness', value: adjustments.brightness },
          { label: 'Contrast', value: adjustments.contrast },
          { label: 'Saturation', value: adjustments.saturation },
          { label: 'WB', value: adjustments.white_balance, defaultValue: 'daylight' },
        ]);

        onOperationComplete({
          type: 'beautify',
          fileCount: successCount,
          outputDir: dir,
          details,
        });
      }
    } catch (error) {
      console.error('Beautification failed:', error);
      processToast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
      dispatch({ type: 'FINISH_BEAUTIFYING', payload: [] });
    }
  };

  const successCount = results.filter((r) => r.success).length;

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
              <Sparkles className="w-4 h-4 text-primary" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Beautify</h1>
              <p className="text-xs text-muted-foreground">
                Enhance images with adjustments and color correction
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
              <ImagePreview
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
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Basic Adjustments
                </h2>
                {hasChanges && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dispatch({ type: 'RESET_ADJUSTMENTS' })}
                    className="h-5 px-1.5 text-[9px] text-muted-foreground hover:text-primary"
                  >
                    <RotateCcw className="w-2.5 h-2.5 mr-0.5" />
                    Reset
                  </Button>
                )}
              </div>
              <div className="space-y-2.5 p-2.5 rounded-md bg-muted/20 border border-border/30">
                <AdjustmentSlider
                  label="Brightness"
                  value={adjustments.brightness}
                  min={-100}
                  max={100}
                  onChange={(v) => dispatch({ type: 'SET_ADJUSTMENT', payload: { brightness: v } })}
                  icon={<Sun className="w-3 h-3 text-muted-foreground" />}
                />
                <AdjustmentSlider
                  label="Contrast"
                  value={adjustments.contrast}
                  min={-100}
                  max={100}
                  onChange={(v) => dispatch({ type: 'SET_ADJUSTMENT', payload: { contrast: v } })}
                  icon={<Contrast className="w-3 h-3 text-muted-foreground" />}
                />
                <AdjustmentSlider
                  label="Saturation"
                  value={adjustments.saturation}
                  min={-100}
                  max={100}
                  onChange={(v) => dispatch({ type: 'SET_ADJUSTMENT', payload: { saturation: v } })}
                  icon={<Droplets className="w-3 h-3 text-muted-foreground" />}
                />
                <AdjustmentSlider
                  label="Sharpness"
                  value={adjustments.sharpness}
                  min={-100}
                  max={100}
                  onChange={(v) => dispatch({ type: 'SET_ADJUSTMENT', payload: { sharpness: v } })}
                  icon={<Focus className="w-3 h-3 text-muted-foreground" />}
                />
                <AdjustmentSlider
                  label="Exposure"
                  value={adjustments.exposure}
                  min={-100}
                  max={100}
                  onChange={(v) => dispatch({ type: 'SET_ADJUSTMENT', payload: { exposure: v } })}
                  icon={<Aperture className="w-3 h-3 text-muted-foreground" />}
                />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Color Correction
              </h2>
              <div className="space-y-2.5 p-2.5 rounded-md bg-muted/20 border border-border/30">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <CircleDot className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[11px] font-medium text-foreground">White Balance</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {whiteBalancePresets.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() =>
                          dispatch({ type: 'SET_ADJUSTMENT', payload: { white_balance: preset.value } })
                        }
                        className={cn(
                          'p-1 rounded text-center transition-colors',
                          adjustments.white_balance === preset.value
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted/30 hover:bg-muted/50 text-muted-foreground'
                        )}
                      >
                        <span className="block text-xs">{preset.icon}</span>
                        <span
                          className={cn(
                            'block text-[8px] mt-0.5',
                            adjustments.white_balance === preset.value ? 'font-medium' : ''
                          )}
                        >
                          {preset.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <AdjustmentSlider
                  label="Hue Shift"
                  value={adjustments.hue_shift}
                  min={-180}
                  max={180}
                  onChange={(v) => dispatch({ type: 'SET_ADJUSTMENT', payload: { hue_shift: v } })}
                  icon={<Palette className="w-3 h-3 text-muted-foreground" />}
                  unit="°"
                />
                <AdjustmentSlider
                  label="Temperature"
                  value={adjustments.temperature}
                  min={-100}
                  max={100}
                  onChange={(v) => dispatch({ type: 'SET_ADJUSTMENT', payload: { temperature: v } })}
                  icon={<Thermometer className="w-3 h-3 text-muted-foreground" />}
                />
                <div className="flex justify-between text-[9px] text-muted-foreground px-0.5">
                  <span>Cool</span>
                  <span>Warm</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Output</label>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  onClick={handleSelectOutputDir}
                  className="flex-1 justify-start gap-1.5 h-8 text-[11px] min-w-0"
                >
                  <FolderOpen className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="truncate text-left flex-1">{outputDir || 'Saved next to original files'}</span>
                </Button>
                {outputDir && (
                  <Button
                    variant="outline"
                    onClick={() => dispatch({ type: 'SET_OUTPUT_DIR', payload: null })}
                    className="h-8 w-8 shrink-0"
                    aria-label="Clear output folder"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
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
                          {successCount}/{results.length} enhanced
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
              onClick={handleBeautify}
              disabled={isBeautifying || images.length === 0}
              className="w-full h-9 text-xs gap-1.5"
            >
              {isBeautifying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Beautify {images.length} image{images.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

BeautifyPage.displayName = 'BeautifyPage';

export { BeautifyPage };
