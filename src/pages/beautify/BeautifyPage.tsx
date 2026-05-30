import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fadeUp } from '@/lib/animations';
import { resolveOutputDir } from '@/lib/utils';
import { useImageProgress } from '@/hooks/useImageProgress';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { useClipboardImagePaste } from '@/hooks/useClipboardImagePaste';
import { usePersistedFormDefaults } from '@/hooks/usePersistedFormDefaults';
import { JobProgressBar } from '@/components/page-parts/JobProgressBar';
import { OutputLocationPicker } from '@/components/page-parts/OutputLocationPicker';
import { FilenameSettings } from '@/components/page-parts/FilenameSettings';
import { ProcessButton } from '@/components/page-parts/ProcessButton';
import { ResultsBanner } from '@/components/page-parts/ResultsBanner';
import { ResultsList } from '@/components/page-parts/ResultsList';
import { ThumbnailStrip } from '@/components/page-parts/ThumbnailStrip';
import { useImagePreview } from '@/hooks/useImagePreview';
import type { PreviewOptions } from '@/components/ImagePreview';
import type { BeautifyResult, ImageInfo, OperationHistoryItem } from '@/types/image';
import {
  beautifyFormSchema,
  defaultAdjustments,
  defaultFormValues,
  type Adjustments,
  type BeautifyFormValues,
} from './_components/schema';
import { BasicAdjustmentsPanel } from './_components/BasicAdjustmentsPanel';
import { ColorCorrectionPanel } from './_components/ColorCorrectionPanel';
import { EmptyState } from './_components/EmptyState';
import { PreviewPane } from './_components/PreviewPane';
import { runBeautify } from './_components/useBeautifyExecution';

type BeautifyPageProps = {
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

const BeautifyPage = ({ onOperationComplete }: BeautifyPageProps) => {
  const form = useForm<BeautifyFormValues>({
    resolver: zodResolver(beautifyFormSchema),
    defaultValues: defaultFormValues,
    mode: 'onChange',
  });
  usePersistedFormDefaults({
    page: 'beautify',
    form,
    baseDefaults: defaultFormValues,
    // Adjustments are per-image; persist only the output-naming choices.
    persistKeys: ['outputDir', 'filenameTemplate', 'overwriteMode'],
  });
  const { control } = form;
  const values = useWatch({ control });
  // useWatch returns Partial during initial render; we always have defaults
  // so widen back to the full Adjustments shape for the panel components.
  const adjustments: Adjustments = {
    brightness: values.brightness ?? defaultAdjustments.brightness,
    contrast: values.contrast ?? defaultAdjustments.contrast,
    saturation: values.saturation ?? defaultAdjustments.saturation,
    sharpness: values.sharpness ?? defaultAdjustments.sharpness,
    exposure: values.exposure ?? defaultAdjustments.exposure,
    hue_shift: values.hue_shift ?? defaultAdjustments.hue_shift,
    temperature: values.temperature ?? defaultAdjustments.temperature,
    white_balance: values.white_balance ?? defaultAdjustments.white_balance,
  };
  const outputDir = values.outputDir ?? null;
  const filenameTemplate = values.filenameTemplate ?? '';
  const overwriteMode = values.overwriteMode ?? 'auto-number';

  const [images, setImages] = useState<ImageInfo[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [results, setResults] = useState<BeautifyResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isBeautifying, setIsBeautifying] = useState(false);

  const progress = useImageProgress(isBeautifying);

  useClipboardImagePaste({
    onImagesAdded: (added) => {
      setImages((prev) => {
        const next = [...prev, ...added];
        if (prev.length === 0) setPreviewIndex(0);
        return next;
      });
    },
    enabled: !isBeautifying,
  });

  const previewImage = images[previewIndex];
  const { src: previewSrc, isLoading: isLoadingPreview } = useImagePreview(previewImage);

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
    [
      adjustments.brightness,
      adjustments.contrast,
      adjustments.saturation,
      adjustments.sharpness,
      adjustments.exposure,
      adjustments.hue_shift,
      adjustments.temperature,
      adjustments.white_balance,
    ]
  );

  const applyPatch = (patch: Partial<Adjustments>) => {
    for (const [key, value] of Object.entries(patch)) {
      form.setValue(key as keyof Adjustments, value as never, { shouldValidate: true });
    }
  };

  const resetAdjustments = () => {
    // Keep the chosen output dir + filename settings; only reset the pixel
    // adjustments. Wiping naming preferences here would surprise the user
    // since the button is labelled "reset adjustments", not "reset all".
    form.reset({ ...defaultFormValues, outputDir, filenameTemplate, overwriteMode });
  };

  const handleImagesChange = (imgs: ImageInfo[]) => {
    setImages(imgs);
    if (previewIndex >= imgs.length) setPreviewIndex(Math.max(0, imgs.length - 1));
  };

  const handleRemove = (index: number) => {
    const next = images.filter((_, i) => i !== index);
    setImages(next);
    if (previewIndex >= next.length) setPreviewIndex(Math.max(0, next.length - 1));
  };

  const handleBeautify = () =>
    runBeautify({
      images,
      values: form.getValues(),
      onStart: () => {
        setIsBeautifying(true);
        setShowResults(false);
      },
      onFinish: (r) => {
        setIsBeautifying(false);
        setResults(r);
        setShowResults(true);
      },
      onOperationComplete,
    });

  const successCount = results.filter((r) => r.success).length;

  useKeyboardShortcut('Enter', handleBeautify, {
    meta: true,
    enabled: images.length > 0 && !isBeautifying,
  });
  useKeyboardShortcut('Escape', () => invoke('cancel_image_jobs'), { enabled: isBeautifying });

  if (images.length === 0) {
    return (
      <EmptyState
        onImagesChange={(imgs) => {
          setImages(imgs);
          setPreviewIndex(0);
        }}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 border-r border-border/50">
          <PreviewPane
            image={previewImage}
            previewSrc={previewSrc}
            isLoading={isLoadingPreview}
            options={previewOptions}
          />

          <ThumbnailStrip
            images={images}
            selectedIndex={previewIndex}
            onSelect={setPreviewIndex}
            onRemove={handleRemove}
            onImagesChange={handleImagesChange}
            footer={
              <>
                {images.length} image{images.length !== 1 ? 's' : ''}
                {previewImage && ` · ${previewImage.name}`}
              </>
            }
          />
        </div>

        <div className="w-72 flex flex-col bg-background overflow-hidden shrink-0">
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <BasicAdjustmentsPanel
              adjustments={adjustments}
              onChange={applyPatch}
              onReset={resetAdjustments}
            />

            <ColorCorrectionPanel adjustments={adjustments} onChange={applyPatch} />

            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Output
              </label>
              <OutputLocationPicker
                value={outputDir}
                onChange={(dir) => form.setValue('outputDir', dir, { shouldValidate: true })}
                size="sm"
              />
            </div>

            <FilenameSettings
              template={filenameTemplate}
              overwriteMode={overwriteMode}
              onTemplateChange={(v) =>
                form.setValue('filenameTemplate', v, { shouldValidate: true })
              }
              onOverwriteModeChange={(v) =>
                form.setValue('overwriteMode', v, { shouldValidate: true })
              }
              size="sm"
            />

            {isBeautifying && images.length > 0 && (
              <JobProgressBar
                items={images.map((img) => ({ path: img.path, name: img.name }))}
                progress={progress}
                running={isBeautifying}
                verb="Beautifying"
                itemName="image"
                onCancel={() => invoke('cancel_image_jobs')}
              />
            )}

            <AnimatePresence>
              {showResults && results.length > 0 && (
                <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-1.5"
                >
                  <ResultsBanner
                    title="Complete"
                    subtitle={`${successCount}/${results.length} enhanced`}
                    size="sm"
                    outputDir={resolveOutputDir({ results, fallbackDir: outputDir })}
                  />
                  <ResultsList results={results} size="sm" maxHeight="max-h-24" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="p-3 border-t border-border/30 bg-background">
            <ProcessButton
              isProcessing={isBeautifying}
              disabled={images.length === 0}
              onClick={handleBeautify}
              icon={Sparkles}
              label={`Beautify ${images.length} image${images.length !== 1 ? 's' : ''}`}
              processingLabel="Processing..."
              size="sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

BeautifyPage.displayName = 'BeautifyPage';

export { BeautifyPage };
