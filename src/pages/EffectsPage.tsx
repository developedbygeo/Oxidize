import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wand2,
  Check,
  Loader2,
  FolderOpen,
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
import { EffectsPreview, type EffectPreviewOptions } from '@/components/EffectsPreview';
import type { ImageInfo, EffectType, EffectResult, OperationHistoryItem } from '@/types/image';
import { effectsList as effects } from '@/types/image';

interface EffectsPageProps {
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const EffectsPage = ({ onOperationComplete }: EffectsPageProps) => {
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [selectedEffect, setSelectedEffect] = useState<EffectType>('grayscale');
  const [intensity, setIntensity] = useState(50);
  const [outputDir, setOutputDir] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<EffectResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewSrc, setPreviewSrc] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Convert to preview options format
  const previewOptions = useMemo<EffectPreviewOptions>(() => ({
    effect: selectedEffect,
    intensity,
  }), [selectedEffect, intensity]);

  // Get current preview image
  const previewImage = images[previewIndex];

  // Fetch full image for preview when selection changes
  useEffect(() => {
    if (!previewImage) {
      setPreviewSrc('');
      return;
    }

    let cancelled = false;
    setIsLoadingPreview(true);

    // Fetch preview image (capped at 800px for good balance of quality and performance)
    invoke<string>('get_image_preview', {
      path: previewImage.path,
      maxDimension: 800
    })
      .then((src) => {
        if (!cancelled) {
          setPreviewSrc(src);
        }
      })
      .catch((error) => {
        console.error('Failed to load preview:', error);
        // Fall back to thumbnail
        if (!cancelled) {
          setPreviewSrc(previewImage.thumbnail);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingPreview(false);
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
      setOutputDir(selected as string);
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    if (previewIndex >= newImages.length) {
      setPreviewIndex(Math.max(0, newImages.length - 1));
    }
  };

  const handleApplyEffect = async () => {
    if (images.length === 0) return;

    setIsProcessing(true);
    setShowResults(false);

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

      setResults(effectResults);
      setShowResults(true);

      // Add to history
      const successCount = effectResults.filter((r) => r.success).length;
      if (successCount > 0 && onOperationComplete) {
        const firstSuccess = effectResults.find((r) => r.success && r.output_path);
        const getDir = (filePath: string) => {
          const lastSep = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
          return lastSep > 0 ? filePath.slice(0, lastSep) : filePath;
        };
        const dir = (firstSuccess?.output_path && getDir(firstSuccess.output_path)) ||
          outputDir ||
          (images[0]?.path && getDir(images[0].path)) ||
          '';

        const effectInfo = effects.find(e => e.type === selectedEffect);
        onOperationComplete({
          type: 'effects',
          fileCount: successCount,
          outputDir: dir,
          details: `${effectInfo?.label || selectedEffect} @ ${intensity}%`,
        });
      }
    } catch (error) {
      console.error('Effect application failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const successCount = results.filter((r) => r.success).length;
  const selectedEffectInfo = effects.find(e => e.type === selectedEffect);

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
            <div className="p-3 rounded-2xl bg-violet-500/10">
              <Wand2 className="w-6 h-6 text-violet-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Apply Effects</h1>
              <p className="text-sm text-muted-foreground">
                Transform your images with stunning visual effects
              </p>
            </div>
          </motion.div>

          {/* Dropzone */}
          <ImageDropzone images={images} onImagesChange={(newImages) => {
            setImages(newImages);
            setPreviewIndex(0);
          }} />

          {/* Effect preview tiles */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-5 gap-3"
          >
            {effects.map((effect, i) => (
              <motion.div
                key={effect.type}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.03 }}
                className={cn(
                  'p-3 rounded-xl border-2 transition-all duration-200 text-center cursor-pointer',
                  'border-border/30 hover:border-violet-500/50 bg-muted/30'
                )}
              >
                <span className="block text-xl mb-1">{effect.icon}</span>
                <span className="block text-xs font-medium text-foreground">{effect.label}</span>
                <span className="block text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                  {effect.description}
                </span>
              </motion.div>
            ))}
          </motion.div>
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
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
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

          {/* Thumbnail strip */}
          <div className="border-t border-border/50 p-3 bg-muted/30">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, index) => (
                <motion.button
                  key={img.path}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => setPreviewIndex(index)}
                  className={cn(
                    'relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all group',
                    previewIndex === index
                      ? 'border-violet-500 ring-2 ring-violet-500/30'
                      : 'border-border/50 hover:border-violet-500/50'
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
                      handleRemoveImage(index);
                    }}
                    className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {/* Selection indicator */}
                  {previewIndex === index && (
                    <div className="absolute inset-0 bg-violet-500/10" />
                  )}
                </motion.button>
              ))}
              {/* Add more button */}
              <ImageDropzone
                images={images}
                onImagesChange={(newImages) => {
                  setImages(newImages);
                }}
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
            {/* Effect Selection */}
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Select Effect
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {effects.map((effect) => (
                  <motion.button
                    key={effect.type}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedEffect(effect.type)}
                    className={cn(
                      'relative p-3 rounded-xl border-2 transition-all duration-200 text-left overflow-hidden',
                      selectedEffect === effect.type
                        ? 'border-violet-500 bg-violet-500/10'
                        : 'border-border/50 hover:border-violet-500/50 hover:bg-muted/50'
                    )}
                  >
                    {/* Gradient background on hover/select */}
                    <div className={cn(
                      'absolute inset-0 bg-linear-to-br opacity-0 transition-opacity',
                      effect.gradient,
                      selectedEffect === effect.type && 'opacity-10'
                    )} />
                    <div className="relative flex items-center gap-2">
                      <span className="text-lg">{effect.icon}</span>
                      <div className="min-w-0">
                        <span
                          className={cn(
                            'block text-xs font-semibold',
                            selectedEffect === effect.type ? 'text-violet-500' : 'text-foreground'
                          )}
                        >
                          {effect.label}
                        </span>
                        <span className="block text-[10px] text-muted-foreground truncate">
                          {effect.description}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Intensity Slider */}
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Intensity
              </h2>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Effect strength</span>
                  <span className="text-xs font-mono tabular-nums text-violet-500">
                    {intensity}%
                  </span>
                </div>
                <Slider
                  value={[intensity]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(values) => setIntensity(values[0])}
                  className="**:data-[slot=slider-track]:h-1.5 **:data-[slot=slider-range]:bg-violet-500 **:data-[slot=slider-thumb]:border-violet-500 **:data-[slot=slider-thumb]:size-4"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Subtle</span>
                  <span>Strong</span>
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
                  <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-violet-500/20">
                        <Check className="w-3.5 h-3.5 text-violet-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">
                          Complete
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {successCount}/{results.length} processed
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
                              'w-1.5 h-1.5 rounded-full shrink-0',
                              result.success ? 'bg-violet-500' : 'bg-destructive'
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

          {/* Apply Effect Button - fixed at bottom */}
          <div className="p-4 border-t border-border/50 bg-background">
            <Button
              onClick={handleApplyEffect}
              disabled={isProcessing || images.length === 0}
              size="lg"
              className="w-full h-11 text-sm gap-2 bg-violet-500 hover:bg-violet-600 text-white"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Applying {selectedEffectInfo?.label}...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Apply {selectedEffectInfo?.label} to {images.length} image{images.length !== 1 ? 's' : ''}
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
