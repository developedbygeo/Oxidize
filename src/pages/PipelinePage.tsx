import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Workflow,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Images,
  ArrowRightLeft,
  Minimize2,
  Sparkles,
  Wand2,
  Play,
  FolderOpen,
  RotateCcw,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { cn, resolveOutputDir } from '@/lib/utils';
import { createProcessToast } from '@/lib/process-toast';
import { fadeIn, fadeUp, fadeSlide, expandHeight, buttonPress } from '@/lib/animations';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from '@/components/ui/form';
import { ImageDropzone } from '@/components/ImageDropzone';
import { ImagePreview } from '@/components/ImagePreview';
import { EffectsPreview } from '@/components/EffectsPreview';
import { PipelinePreview } from '@/components/PipelinePreview';
import { PreviewNavigation } from '@/components/PreviewNavigation';
import type { PreviewOptions } from '@/lib/image-preview';
import type { EffectPreviewOptions } from '@/lib/image-preview';
import type {
  ImageInfo,
  ImageFormat,
  OperationHistoryItem,
  WhiteBalancePreset,
  ConversionResult,
  CompressionResult,
  BeautifyResult,
  EffectResult,
} from '@/types/image';
import { formatLabels, effectsList } from '@/types/image';

type PipelinePageProps = {
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

const pipelineSchema = z.object({
  convertEnabled: z.boolean(),
  convertFormat: z.enum(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'ico', 'tiff']),
  convertQuality: z.number().min(1).max(100),

  compressEnabled: z.boolean(),
  compressQuality: z.number().min(10).max(100),

  beautifyEnabled: z.boolean(),
  brightness: z.number().min(-100).max(100),
  contrast: z.number().min(-100).max(100),
  saturation: z.number().min(-100).max(100),
  sharpness: z.number().min(0).max(100),
  exposure: z.number().min(-100).max(100),
  hueShift: z.number().min(-180).max(180),
  temperature: z.number().min(-100).max(100),
  whiteBalance: z.enum(['auto', 'daylight', 'cloudy', 'tungsten', 'fluorescent']),

  effectsEnabled: z.boolean(),
  effectType: z.enum([
    'grayscale',
    'sepia',
    'vintage',
    'blur',
    'sharpen',
    'invert',
    'vignette',
    'noise',
    'pixelate',
    'posterize',
  ]),
  effectIntensity: z.number().min(0).max(100),

  outputDir: z.string().nullable(),
});

type PipelineFormValues = z.infer<typeof pipelineSchema>;

const defaultValues: PipelineFormValues = {
  convertEnabled: false,
  convertFormat: 'webp',
  convertQuality: 90,

  compressEnabled: true,
  compressQuality: 80,

  beautifyEnabled: false,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  sharpness: 0,
  exposure: 0,
  hueShift: 0,
  temperature: 0,
  whiteBalance: 'auto',

  effectsEnabled: false,
  effectType: 'grayscale',
  effectIntensity: 50,

  outputDir: null,
};

const steps = [
  { id: 'images', label: 'Images', icon: Images, description: 'Select files' },
  { id: 'convert', label: 'Convert', icon: ArrowRightLeft, description: 'Change format' },
  { id: 'compress', label: 'Compress', icon: Minimize2, description: 'Reduce size' },
  { id: 'beautify', label: 'Beautify', icon: Sparkles, description: 'Enhance' },
  { id: 'effects', label: 'Effects', icon: Wand2, description: 'Apply filters' },
  { id: 'review', label: 'Review', icon: Play, description: 'Execute' },
] as const;

type StepId = (typeof steps)[number]['id'];

const formatOptions: { value: ImageFormat; label: string }[] = [
  { value: 'webp', label: 'WebP' },
  { value: 'png', label: 'PNG' },
  { value: 'jpg', label: 'JPEG' },
  { value: 'gif', label: 'GIF' },
  { value: 'bmp', label: 'BMP' },
  { value: 'tiff', label: 'TIFF' },
];

const whiteBalanceOptions: { value: WhiteBalancePreset; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'daylight', label: 'Daylight' },
  { value: 'cloudy', label: 'Cloudy' },
  { value: 'tungsten', label: 'Tungsten' },
  { value: 'fluorescent', label: 'Fluorescent' },
];

const beautifySliders = [
  { name: 'brightness' as const, label: 'Brightness', min: -100, max: 100 },
  { name: 'contrast' as const, label: 'Contrast', min: -100, max: 100 },
  { name: 'saturation' as const, label: 'Saturation', min: -100, max: 100 },
  { name: 'sharpness' as const, label: 'Sharpness', min: 0, max: 100 },
  { name: 'exposure' as const, label: 'Exposure', min: -100, max: 100 },
  { name: 'temperature' as const, label: 'Temperature', min: -100, max: 100 },
];

const PipelinePage = ({ onOperationComplete }: PipelinePageProps) => {
  const [currentStep, setCurrentStep] = useState<StepId>('images');
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<StepId>>(() => new Set());
  const [previewIndex, setPreviewIndex] = useState(0);

  const form = useForm<PipelineFormValues>({
    resolver: zodResolver(pipelineSchema),
    defaultValues,
    mode: 'onChange',
  });

  const watchedValues = useWatch({ control: form.control });

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const goToStep = (stepId: StepId) => {
    if (stepId === 'images' || images.length > 0) {
      setCurrentStep(stepId);
    }
  };

  const goNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setCurrentStep(steps[currentStepIndex + 1].id);
    }
  };

  const goPrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].id);
    }
  };

  const handleImagesChange = useCallback((newImages: ImageInfo[]) => {
    setImages(newImages);
    setPreviewIndex(0);
  }, []);

  const previewImage = images[previewIndex] ?? images[0];

  const goToPrevImage = useCallback(() => {
    setPreviewIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const goToNextImage = useCallback(() => {
    setPreviewIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  const handleSelectOutputDir = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
    });
    if (selected) {
      form.setValue('outputDir', selected as string);
    }
  };

  const getEnabledStepsCount = useCallback(() => {
    let count = 0;
    if (watchedValues.convertEnabled) count++;
    if (watchedValues.compressEnabled) count++;
    if (watchedValues.beautifyEnabled) count++;
    if (watchedValues.effectsEnabled) count++;
    return count;
  }, [watchedValues]);

  const beautifyPreviewOptions = useMemo(
    (): PreviewOptions => ({
      brightness: watchedValues.brightness ?? 0,
      contrast: watchedValues.contrast ?? 0,
      saturation: watchedValues.saturation ?? 0,
      sharpness: watchedValues.sharpness ?? 0,
      exposure: watchedValues.exposure ?? 0,
      hueShift: watchedValues.hueShift ?? 0,
      temperature: watchedValues.temperature ?? 0,
      whiteBalance: (watchedValues.whiteBalance as PreviewOptions['whiteBalance']) ?? 'auto',
    }),
    [
      watchedValues.brightness,
      watchedValues.contrast,
      watchedValues.saturation,
      watchedValues.sharpness,
      watchedValues.exposure,
      watchedValues.hueShift,
      watchedValues.temperature,
      watchedValues.whiteBalance,
    ]
  );

  const effectsPreviewOptions = useMemo(
    (): EffectPreviewOptions => ({
      effect: (watchedValues.effectType as EffectPreviewOptions['effect']) ?? 'grayscale',
      intensity: watchedValues.effectIntensity ?? 50,
    }),
    [watchedValues.effectType, watchedValues.effectIntensity]
  );

  const handleExecutePipeline = async () => {
    if (images.length === 0 || getEnabledStepsCount() === 0) return;

    setIsProcessing(true);
    const processToast = createProcessToast({ action: 'Pipeline', itemCount: images.length });

    let currentPaths = images.map((img) => img.path);
    let totalSaved = 0;
    const outputDir = watchedValues.outputDir ?? null;
    const details: string[] = [];
    const intermediateFiles: string[] = [];

    const enabledOps = [
      watchedValues.convertEnabled && 'convert',
      watchedValues.compressEnabled && 'compress',
      watchedValues.beautifyEnabled && 'beautify',
      watchedValues.effectsEnabled && 'effects',
    ].filter(Boolean) as string[];

    const isLastOp = (op: string) => enabledOps[enabledOps.length - 1] === op;

    try {
      if (watchedValues.convertEnabled && currentPaths.length > 0) {
        const results = await invoke<ConversionResult[]>('convert_images_batch', {
          inputPaths: currentPaths,
          options: {
            format: watchedValues.convertFormat,
            quality: watchedValues.convertQuality,
            output_dir: isLastOp('convert') ? outputDir : null,
            skip_timestamp_dir: !isLastOp('convert'),
          },
        });

        const successful = results.filter((r) => r.success);
        const newPaths = successful.map((r) => r.output_path!).filter(Boolean);
        if (!isLastOp('convert')) {
          intermediateFiles.push(...newPaths);
        }
        currentPaths = newPaths;
        details.push(`Converted to ${formatLabels[watchedValues.convertFormat as ImageFormat]}`);
      }

      if (watchedValues.compressEnabled && currentPaths.length > 0) {
        const results = await invoke<CompressionResult[]>('compress_images_batch', {
          inputPaths: currentPaths,
          options: {
            quality: watchedValues.compressQuality,
            output_dir: isLastOp('compress') ? outputDir : null,
            skip_timestamp_dir: !isLastOp('compress'),
          },
        });

        const successful = results.filter((r) => r.success);
        totalSaved += results.reduce((acc, r) => acc + (r.original_size - r.new_size), 0);
        const newPaths = successful.map((r) => r.output_path!).filter(Boolean);
        if (!isLastOp('compress')) {
          intermediateFiles.push(...newPaths);
        }
        currentPaths = newPaths;
        details.push(`Compressed at ${watchedValues.compressQuality}% quality`);
      }

      if (watchedValues.beautifyEnabled && currentPaths.length > 0) {
        const results = await invoke<BeautifyResult[]>('beautify_images_batch', {
          inputPaths: currentPaths,
          options: {
            brightness: watchedValues.brightness,
            contrast: watchedValues.contrast,
            saturation: watchedValues.saturation,
            sharpness: watchedValues.sharpness,
            exposure: watchedValues.exposure,
            hue_shift: watchedValues.hueShift,
            temperature: watchedValues.temperature,
            white_balance: watchedValues.whiteBalance,
            output_dir: isLastOp('beautify') ? outputDir : null,
            skip_timestamp_dir: !isLastOp('beautify'),
          },
        });

        const successful = results.filter((r) => r.success);
        const newPaths = successful.map((r) => r.output_path!).filter(Boolean);
        if (!isLastOp('beautify')) {
          intermediateFiles.push(...newPaths);
        }
        currentPaths = newPaths;
        details.push('Applied beautify adjustments');
      }

      if (watchedValues.effectsEnabled && currentPaths.length > 0) {
        const results = await invoke<EffectResult[]>('apply_image_effects_batch', {
          inputPaths: currentPaths,
          options: {
            effect: watchedValues.effectType,
            intensity: watchedValues.effectIntensity,
            output_dir: isLastOp('effects') ? outputDir : null,
            skip_timestamp_dir: !isLastOp('effects'),
          },
        });

        const successful = results.filter((r) => r.success);
        currentPaths = successful.map((r) => r.output_path!).filter(Boolean);
        const effectInfo = effectsList.find((e) => e.type === watchedValues.effectType);
        details.push(`Applied ${effectInfo?.label || watchedValues.effectType} effect`);
      }

      for (const filePath of intermediateFiles) {
        try {
          await invoke('delete_file', { path: filePath });
        } catch {
          // Ignore deletion errors for intermediate files
        }
      }

      const successCount = currentPaths.length;
      const failCount = images.length - successCount;
      processToast.finish({ successCount, failCount });

      if (successCount > 0 && onOperationComplete) {
        const dir = resolveOutputDir({
          results: currentPaths.map((p): { output_path: string | null } => ({ output_path: p })),
          fallbackDir: outputDir,
          fallbackPath: images[0]?.path,
        });

        onOperationComplete({
          type: 'pipeline',
          fileCount: images.length,
          outputDir: dir,
          details: `Pipeline: ${details.join(' → ')}`,
          totalSaved: totalSaved > 0 ? totalSaved : undefined,
        });
      }
    } catch (error) {
      console.error('Pipeline failed:', error);
      processToast.error(error instanceof Error ? error.message : 'Pipeline execution failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setImages([]);
    setCurrentStep('images');
    setCompletedSteps(new Set());
    setPreviewIndex(0);
    form.reset(defaultValues);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'images':
        return (
          <div className="space-y-4">
            <ImageDropzone images={images} onImagesChange={handleImagesChange} />
            {images.length > 0 && (
              <motion.p
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                className="text-sm text-muted-foreground text-center"
              >
                {images.length} image{images.length !== 1 ? 's' : ''} selected
              </motion.p>
            )}
          </div>
        );

      case 'convert':
        return (
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="convertEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-xl border border-border/50 p-4 bg-muted/30">
                  <div>
                    <FormLabel className="text-base font-semibold">Enable Conversion</FormLabel>
                    <FormDescription>Change the image format</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <AnimatePresence>
              {watchedValues.convertEnabled && (
                <motion.div
                  variants={expandHeight}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="convertFormat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Output Format</FormLabel>
                        <div className="grid grid-cols-3 gap-2">
                          {formatOptions.map((option) => (
                            <motion.button
                              key={option.value}
                              type="button"
                              {...buttonPress}
                              onClick={() => field.onChange(option.value)}
                              className={cn(
                                'p-3 rounded-xl border-2 transition-all text-sm font-medium',
                                field.value === option.value
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border/50 hover:border-primary/50'
                              )}
                            >
                              {option.label}
                            </motion.button>
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="convertQuality"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between">
                          <FormLabel>Quality</FormLabel>
                          <span className="text-sm font-mono text-primary">{field.value}%</span>
                        </div>
                        <FormControl>
                          <Slider
                            value={[field.value]}
                            onValueChange={([v]) => field.onChange(v)}
                            min={1}
                            max={100}
                            step={1}
                            className="**:data-[slot=slider-range]:bg-primary **:data-[slot=slider-thumb]:border-primary"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );

      case 'compress':
        return (
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="compressEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-xl border border-border/50 p-4 bg-muted/30">
                  <div>
                    <FormLabel className="text-base font-semibold">Enable Compression</FormLabel>
                    <FormDescription>Reduce file sizes</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <AnimatePresence>
              {watchedValues.compressEnabled && (
                <motion.div
                  variants={expandHeight}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="compressQuality"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between">
                          <FormLabel>Compression Quality</FormLabel>
                          <span className="text-sm font-mono text-primary">{field.value}%</span>
                        </div>
                        <FormControl>
                          <Slider
                            value={[field.value]}
                            onValueChange={([v]) => field.onChange(v)}
                            min={10}
                            max={100}
                            step={1}
                            className="**:data-[slot=slider-range]:bg-primary **:data-[slot=slider-thumb]:border-primary"
                          />
                        </FormControl>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Smaller file</span>
                          <span>Better quality</span>
                        </div>
                      </FormItem>
                    )}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );

      case 'beautify':
        return (
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="beautifyEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-xl border border-border/50 p-4 bg-muted/30">
                  <div>
                    <FormLabel className="text-base font-semibold">Enable Beautify</FormLabel>
                    <FormDescription>Enhance image appearance</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <AnimatePresence>
              {watchedValues.beautifyEnabled && (
                <motion.div
                  variants={expandHeight}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    {beautifySliders.map((slider) => (
                      <FormField
                        key={slider.name}
                        control={form.control}
                        name={slider.name}
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex justify-between">
                              <FormLabel className="text-xs">{slider.label}</FormLabel>
                              <span className="text-xs font-mono text-primary">{field.value}</span>
                            </div>
                            <FormControl>
                              <Slider
                                value={[field.value]}
                                onValueChange={([v]) => field.onChange(v)}
                                min={slider.min}
                                max={slider.max}
                                step={1}
                                className="**:data-[slot=slider-range]:bg-primary **:data-[slot=slider-thumb]:border-primary"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>

                  <FormField
                    control={form.control}
                    name="whiteBalance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>White Balance</FormLabel>
                        <div className="grid grid-cols-5 gap-2">
                          {whiteBalanceOptions.map((option) => (
                            <motion.button
                              key={option.value}
                              type="button"
                              {...buttonPress}
                              onClick={() => field.onChange(option.value)}
                              className={cn(
                                'p-2 rounded-lg border-2 transition-all text-xs font-medium',
                                field.value === option.value
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border/50 hover:border-primary/50'
                              )}
                            >
                              {option.label}
                            </motion.button>
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {images.length > 0 && watchedValues.beautifyEnabled && previewImage && (
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="mt-4"
              >
                <PreviewNavigation
                  currentIndex={previewIndex}
                  total={images.length}
                  onPrev={goToPrevImage}
                  onNext={goToNextImage}
                                  >
                  <ImagePreview
                    src={previewImage.thumbnail}
                    options={beautifyPreviewOptions}
                    className="h-75"
                  />
                </PreviewNavigation>
              </motion.div>
            )}
          </div>
        );

      case 'effects':
        return (
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="effectsEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-xl border border-border/50 p-4 bg-muted/30">
                  <div>
                    <FormLabel className="text-base font-semibold">Enable Effects</FormLabel>
                    <FormDescription>Apply visual filters</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <AnimatePresence>
              {watchedValues.effectsEnabled && (
                <motion.div
                  variants={expandHeight}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="effectType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Effect Type</FormLabel>
                        <div className="grid grid-cols-5 gap-2">
                          {effectsList.map((effect) => (
                            <motion.button
                              key={effect.type}
                              type="button"
                              {...buttonPress}
                              onClick={() => field.onChange(effect.type)}
                              className={cn(
                                'p-2 rounded-xl border-2 transition-all text-center',
                                field.value === effect.type
                                  ? 'border-primary bg-primary/10'
                                  : 'border-border/50 hover:border-primary/50'
                              )}
                            >
                              <span className="text-lg">{effect.icon}</span>
                              <span
                                className={cn(
                                  'block text-xs font-medium mt-1',
                                  field.value === effect.type ? 'text-primary' : 'text-foreground'
                                )}
                              >
                                {effect.label}
                              </span>
                            </motion.button>
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="effectIntensity"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between">
                          <FormLabel>Intensity</FormLabel>
                          <span className="text-sm font-mono text-primary">{field.value}%</span>
                        </div>
                        <FormControl>
                          <Slider
                            value={[field.value]}
                            onValueChange={([v]) => field.onChange(v)}
                            min={0}
                            max={100}
                            step={1}
                            className="**:data-[slot=slider-range]:bg-primary **:data-[slot=slider-thumb]:border-primary"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {images.length > 0 && watchedValues.effectsEnabled && previewImage && (
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="mt-4"
              >
                <PreviewNavigation
                  currentIndex={previewIndex}
                  total={images.length}
                  onPrev={goToPrevImage}
                  onNext={goToNextImage}
                                  >
                  <EffectsPreview
                    src={previewImage.thumbnail}
                    options={effectsPreviewOptions}
                    className="h-75"
                  />
                </PreviewNavigation>
              </motion.div>
            )}
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            {images.length > 0 && (watchedValues.beautifyEnabled || watchedValues.effectsEnabled) && previewImage && (
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
              >
                <PreviewNavigation
                  currentIndex={previewIndex}
                  total={images.length}
                  onPrev={goToPrevImage}
                  onNext={goToNextImage}
                                  >
                  <PipelinePreview
                    src={previewImage.thumbnail}
                    beautifyEnabled={watchedValues.beautifyEnabled ?? false}
                    beautifyOptions={beautifyPreviewOptions}
                    effectsEnabled={watchedValues.effectsEnabled ?? false}
                    effectsOptions={effectsPreviewOptions}
                    className="h-64"
                  />
                </PreviewNavigation>
              </motion.div>
            )}

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Pipeline Summary</h3>
              <div className="grid gap-3">
                <Card className={cn('border-2', images.length > 0 ? 'border-primary/30' : 'border-border/50')}>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center gap-2">
                      <Images className="w-4 h-4 text-primary" />
                      <CardTitle className="text-sm">Images</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <CardDescription>
                      {images.length} image{images.length !== 1 ? 's' : ''} selected
                    </CardDescription>
                  </CardContent>
                </Card>

                {watchedValues.convertEnabled && (
                  <Card className="border-2 border-primary/30">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="w-4 h-4 text-primary" />
                        <CardTitle className="text-sm">Convert</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <CardDescription>
                        To {formatLabels[watchedValues.convertFormat as ImageFormat]} at {watchedValues.convertQuality}% quality
                      </CardDescription>
                    </CardContent>
                  </Card>
                )}

                {watchedValues.compressEnabled && (
                  <Card className="border-2 border-primary/30">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center gap-2">
                        <Minimize2 className="w-4 h-4 text-primary" />
                        <CardTitle className="text-sm">Compress</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <CardDescription>Quality: {watchedValues.compressQuality}%</CardDescription>
                    </CardContent>
                  </Card>
                )}

                {watchedValues.beautifyEnabled && (
                  <Card className="border-2 border-primary/30">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <CardTitle className="text-sm">Beautify</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <CardDescription>
                        {[
                          watchedValues.brightness !== 0 && `Brightness: ${watchedValues.brightness}`,
                          watchedValues.contrast !== 0 && `Contrast: ${watchedValues.contrast}`,
                          watchedValues.saturation !== 0 && `Saturation: ${watchedValues.saturation}`,
                          watchedValues.sharpness !== 0 && `Sharpness: ${watchedValues.sharpness}`,
                        ]
                          .filter(Boolean)
                          .join(', ') || 'Default settings'}
                      </CardDescription>
                    </CardContent>
                  </Card>
                )}

                {watchedValues.effectsEnabled && (
                  <Card className="border-2 border-primary/30">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-primary" />
                        <CardTitle className="text-sm">Effects</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <CardDescription>
                        {effectsList.find((e) => e.type === watchedValues.effectType)?.label} at{' '}
                        {watchedValues.effectIntensity}% intensity
                      </CardDescription>
                    </CardContent>
                  </Card>
                )}

                {getEnabledStepsCount() === 0 && (
                  <Card className="border-2 border-destructive/30 bg-destructive/5">
                    <CardContent className="p-4">
                      <p className="text-sm text-destructive">
                        No operations enabled. Go back and enable at least one operation.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Output Location</label>
              <Button variant="outline" onClick={handleSelectOutputDir} className="w-full justify-start gap-2 h-12">
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
                <span className="truncate text-left flex-1">
                  {watchedValues.outputDir || 'Same as original (click to change)'}
                </span>
              </Button>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleReset} className="flex-1 h-12 gap-2">
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
              <Button
                onClick={handleExecutePipeline}
                disabled={isProcessing || images.length === 0 || getEnabledStepsCount() === 0}
                className="flex-1 h-12 gap-2 bg-primary hover:bg-primary/90"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin">
                      <Loader2 className="w-4 h-4" />
                    </div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Execute Pipeline
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-5">
        <motion.div variants={fadeIn} initial="hidden" animate="visible" className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Workflow className="w-4 h-4 text-primary" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Pipeline</h1>
            <p className="text-xs text-muted-foreground">
              Chain multiple operations in a workflow
            </p>
          </div>
        </motion.div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/20 border border-border/30">
          {steps.map((step) => {
            const isActive = currentStep === step.id;
            const isCompleted = completedSteps.has(step.id);
            const isAccessible = step.id === 'images' || images.length > 0;

            return (
              <button
                key={step.id}
                onClick={() => goToStep(step.id)}
                disabled={!isAccessible}
                className={cn(
                  'flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-md transition-colors',
                  isActive && 'bg-primary/10',
                  !isActive && isAccessible && 'hover:bg-muted/50',
                  !isAccessible && 'opacity-40 cursor-not-allowed'
                )}
              >
                <div
                  className={cn(
                    'p-1.5 rounded transition-colors',
                    isActive ? 'bg-primary/15' : isCompleted ? 'bg-primary/10' : 'bg-muted/50'
                  )}
                >
                  {isCompleted && !isActive ? (
                    <Check className="w-3 h-3 text-primary" />
                  ) : (
                    <step.icon
                      className={cn('w-3 h-3', isActive ? 'text-primary' : 'text-muted-foreground')}
                      strokeWidth={1.75}
                    />
                  )}
                </div>
                <span className={cn('text-[10px] font-medium', isActive ? 'text-primary' : 'text-muted-foreground')}>
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>

        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                variants={fadeSlide}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="min-h-100"
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </form>
        </Form>

        {currentStep !== 'review' && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={goPrev}
              disabled={currentStepIndex === 0}
              className="flex-1 h-9 gap-1.5 text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </Button>
            <Button
              onClick={goNext}
              disabled={currentStep === 'images' && images.length === 0}
              className="flex-1 h-9 gap-1.5 text-xs"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

PipelinePage.displayName = 'PipelinePage';

export { PipelinePage };
