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
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ImageDropzone } from '@/components/ImageDropzone';
import { ImagePreview, type PreviewOptions } from '@/components/ImagePreview';
import type { ImageInfo, BeautifyOptions, BeautifyResult, WhiteBalancePreset, OperationHistoryItem } from '@/types/image';

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
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium text-foreground">{label}</span>
      </div>
      <span className={cn(
        'text-xs font-mono tabular-nums',
        value === 0 ? 'text-muted-foreground' : 'text-amber-500'
      )}>
        {value > 0 ? '+' : ''}{value}{unit}
      </span>
    </div>
    <Slider
      value={[value]}
      min={min}
      max={max}
      step={1}
      onValueChange={(values) => onChange(values[0])}
      className="**:data-[slot=slider-track]:h-1.5 **:data-[slot=slider-range]:bg-amber-500 **:data-[slot=slider-thumb]:border-amber-500 **:data-[slot=slider-thumb]:size-4"
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

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
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
      const newPreviewIndex = state.previewIndex >= newImages.length
        ? Math.max(0, newImages.length - 1)
        : state.previewIndex;
      return { ...state, images: newImages, previewIndex: newPreviewIndex };
    }
    default:
      return state;
  }
};

const BeautifyPage = ({ onOperationComplete }: BeautifyPageProps) => {
  const [state, dispatch] = useReducer(beautifyReducer, initialState);
  const { images, adjustments, outputDir, isBeautifying, results, showResults, previewIndex, previewSrc, isLoadingPreview } = state;

  // Convert adjustments to preview options format
  const previewOptions = useMemo<PreviewOptions>(() => ({
    brightness: adjustments.brightness,
    contrast: adjustments.contrast,
    saturation: adjustments.saturation,
    sharpness: adjustments.sharpness,
    exposure: adjustments.exposure,
    hueShift: adjustments.hue_shift,
    temperature: adjustments.temperature,
    whiteBalance: adjustments.white_balance,
  }), [adjustments]);

  // Get current preview image
  const previewImage = images[previewIndex];

  // Fetch full image for preview when selection changes
  useEffect(() => {
    if (!previewImage) {
      dispatch({ type: 'SET_PREVIEW_SRC', payload: '' });
      return;
    }

    let cancelled = false;
    dispatch({ type: 'SET_LOADING_PREVIEW', payload: true });

    // Fetch preview image (capped at 800px for good balance of quality and performance)
    invoke<string>('get_image_preview', {
      path: previewImage.path,
      maxDimension: 800
    })
      .then((src) => {
        if (!cancelled) {
          dispatch({ type: 'SET_PREVIEW_SRC', payload: src });
        }
      })
      .catch((error) => {
        console.error('Failed to load preview:', error);
        // Fall back to thumbnail
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

      // Add to history
      const successCount = beautifyResults.filter((r) => r.success).length;
      if (successCount > 0 && onOperationComplete) {
        const firstSuccess = beautifyResults.find((r) => r.success && r.output_path);
        const getDir = (filePath: string) => {
          const lastSep = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
          return lastSep > 0 ? filePath.slice(0, lastSep) : filePath;
        };
        const dir = (firstSuccess?.output_path && getDir(firstSuccess.output_path)) ||
          outputDir ||
          (images[0]?.path && getDir(images[0].path)) ||
          '';

        // Build details string
        const changes: string[] = [];
        if (adjustments.brightness !== 0) changes.push(`Brightness ${adjustments.brightness > 0 ? '+' : ''}${adjustments.brightness}`);
        if (adjustments.contrast !== 0) changes.push(`Contrast ${adjustments.contrast > 0 ? '+' : ''}${adjustments.contrast}`);
        if (adjustments.saturation !== 0) changes.push(`Saturation ${adjustments.saturation > 0 ? '+' : ''}${adjustments.saturation}`);
        if (adjustments.white_balance !== 'daylight') changes.push(`WB: ${adjustments.white_balance}`);
        const details = changes.length > 0 ? changes.slice(0, 3).join(', ') : 'No adjustments';

        onOperationComplete({
          type: 'beautify',
          fileCount: successCount,
          outputDir: dir,
          details,
        });
      }
    } catch (error) {
      console.error('Beautification failed:', error);
      dispatch({ type: 'FINISH_BEAUTIFYING', payload: [] });
    }
  };

  const successCount = results.filter((r) => r.success).length;

  // No images - show dropzone
  if (images.length === 0) {
    return (
      <div className="h-full overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <div className="p-3 rounded-2xl bg-amber-500/10">
              <Sparkles className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Beautify Images</h1>
              <p className="text-sm text-muted-foreground">
                Enhance your images with adjustments and color correction
              </p>
            </div>
          </motion.div>

          {/* Dropzone */}
          <ImageDropzone images={images} onImagesChange={(newImages) => {
            dispatch({ type: 'SET_IMAGES', payload: newImages });
            dispatch({ type: 'SET_PREVIEW_INDEX', payload: 0 });
          }} />
        </div>
      </div>
    );
  }

  // Has images - show side-by-side editor layout
  return (
    <div className="h-full flex flex-col">
      {/* Main content - side by side */}
      <div className="flex-1 flex min-h-0">
        {/* Left side - Preview (takes up most space) */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-border/50">
          {/* Preview area */}
          <div className="flex-1 min-h-0 relative">
            {isLoadingPreview && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
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

          {/* Thumbnail strip */}
          <div className="border-t border-border/50 p-3 bg-muted/30">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, index) => (
                <motion.button
                  key={img.path}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => dispatch({ type: 'SET_PREVIEW_INDEX', payload: index })}
                  className={cn(
                    'relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all group',
                    previewIndex === index
                      ? 'border-amber-500 ring-2 ring-amber-500/30'
                      : 'border-border/50 hover:border-amber-500/50'
                  )}
                >
                  <img
                    src={img.thumbnail}
                    alt={img.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Remove button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({ type: 'REMOVE_IMAGE', payload: index });
                    }}
                    className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {/* Selection indicator */}
                  {previewIndex === index && (
                    <div className="absolute inset-0 bg-amber-500/10" />
                  )}
                </motion.button>
              ))}
              {/* Add more button */}
              <ImageDropzone
                images={images}
                onImagesChange={(newImages) => dispatch({ type: 'SET_IMAGES', payload: newImages })}
                compact
                className="shrink-0 w-14 h-14"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {images.length} image{images.length !== 1 ? 's' : ''} selected
              {previewImage && ` • ${previewImage.name}`}
            </p>
          </div>
        </div>

        {/* Right side - Controls */}
        <div className="w-80 flex flex-col bg-background overflow-hidden shrink-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Basic Adjustments */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Basic Adjustments
                </h2>
                {hasChanges && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dispatch({ type: 'RESET_ADJUSTMENTS' })}
                    className="h-6 px-2 text-[10px] text-muted-foreground hover:text-amber-500"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Reset
                  </Button>
                )}
              </div>
              <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                <AdjustmentSlider
                  label="Brightness"
                  value={adjustments.brightness}
                  min={-100}
                  max={100}
                  onChange={(v) => dispatch({ type: 'SET_ADJUSTMENT', payload: { brightness: v } })}
                  icon={<Sun className="w-3.5 h-3.5 text-amber-500" />}
                />
                <AdjustmentSlider
                  label="Contrast"
                  value={adjustments.contrast}
                  min={-100}
                  max={100}
                  onChange={(v) => dispatch({ type: 'SET_ADJUSTMENT', payload: { contrast: v } })}
                  icon={<Contrast className="w-3.5 h-3.5 text-amber-500" />}
                />
                <AdjustmentSlider
                  label="Saturation"
                  value={adjustments.saturation}
                  min={-100}
                  max={100}
                  onChange={(v) => dispatch({ type: 'SET_ADJUSTMENT', payload: { saturation: v } })}
                  icon={<Droplets className="w-3.5 h-3.5 text-amber-500" />}
                />
                <AdjustmentSlider
                  label="Sharpness"
                  value={adjustments.sharpness}
                  min={-100}
                  max={100}
                  onChange={(v) => dispatch({ type: 'SET_ADJUSTMENT', payload: { sharpness: v } })}
                  icon={<Focus className="w-3.5 h-3.5 text-amber-500" />}
                />
                <AdjustmentSlider
                  label="Exposure"
                  value={adjustments.exposure}
                  min={-100}
                  max={100}
                  onChange={(v) => dispatch({ type: 'SET_ADJUSTMENT', payload: { exposure: v } })}
                  icon={<Aperture className="w-3.5 h-3.5 text-amber-500" />}
                />
              </div>
            </div>

            {/* Color Correction */}
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Color Correction
              </h2>
              <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                {/* White Balance Presets */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CircleDot className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-medium text-foreground">White Balance</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {whiteBalancePresets.map((preset) => (
                      <motion.button
                        key={preset.value}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => dispatch({ type: 'SET_ADJUSTMENT', payload: { white_balance: preset.value } })}
                        className={cn(
                          'p-1.5 rounded-md border transition-all duration-200 text-center',
                          adjustments.white_balance === preset.value
                            ? 'border-amber-500 bg-amber-500/10'
                            : 'border-border/50 hover:border-amber-500/50 hover:bg-muted/50'
                        )}
                      >
                        <span className="block text-sm">{preset.icon}</span>
                        <span className={cn(
                          'block text-[9px] mt-0.5',
                          adjustments.white_balance === preset.value ? 'text-amber-500 font-medium' : 'text-muted-foreground'
                        )}>
                          {preset.label}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <AdjustmentSlider
                  label="Hue Shift"
                  value={adjustments.hue_shift}
                  min={-180}
                  max={180}
                  onChange={(v) => dispatch({ type: 'SET_ADJUSTMENT', payload: { hue_shift: v } })}
                  icon={<Palette className="w-3.5 h-3.5 text-amber-500" />}
                  unit="°"
                />
                <AdjustmentSlider
                  label="Temperature"
                  value={adjustments.temperature}
                  min={-100}
                  max={100}
                  onChange={(v) => dispatch({ type: 'SET_ADJUSTMENT', payload: { temperature: v } })}
                  icon={<Thermometer className="w-3.5 h-3.5 text-amber-500" />}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground -mt-1 px-1">
                  <span>Cool</span>
                  <span>Warm</span>
                </div>
              </div>
            </div>

            {/* Output Directory */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">
                Output Location
              </label>
              <Button
                variant="outline"
                onClick={handleSelectOutputDir}
                className="w-full justify-start gap-2 h-9 text-xs"
              >
                <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="truncate text-left flex-1">
                  {outputDir || 'Same as original'}
                </span>
              </Button>
            </div>

            {/* Results */}
            <AnimatePresence>
              {showResults && results.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-2"
                >
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-amber-500/20">
                        <Check className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">
                          Complete
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {successCount}/{results.length} enhanced
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Individual Results */}
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {results.map((result, index) => (
                      <motion.button
                        key={index}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
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
                          'w-full flex items-center justify-between p-2 rounded-md text-xs transition-colors',
                          result.success
                            ? 'bg-muted/50 hover:bg-muted cursor-pointer'
                            : 'bg-destructive/10 cursor-default'
                        )}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div
                            className={cn(
                              'w-1.5 h-1.5 rounded-full flex-shrink-0',
                              result.success ? 'bg-amber-500' : 'bg-destructive'
                            )}
                          />
                          <span className="truncate">
                            {result.output_path?.split(/[/\\]/).pop() || `Image ${index + 1}`}
                          </span>
                        </div>
                        {result.success && (
                          <div className="flex items-center gap-1.5 ml-2">
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {formatFileSize(result.new_size)}
                            </span>
                            <ExternalLink className="w-3 h-3 text-muted-foreground" />
                          </div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Beautify Button - fixed at bottom */}
          <div className="p-4 border-t border-border/50 bg-background">
            <Button
              onClick={handleBeautify}
              disabled={isBeautifying || images.length === 0}
              size="lg"
              className="w-full h-11 text-sm gap-2 bg-amber-500 hover:bg-amber-600 text-white"
            >
              {isBeautifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Beautifying...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
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
