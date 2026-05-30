import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wand2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fadeUp } from '@/lib/animations';
import { resolveOutputDir } from '@/lib/utils';
import { useImageProgress } from '@/hooks/useImageProgress';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { usePersistedFormDefaults } from '@/hooks/usePersistedFormDefaults';
import { JobProgressBar } from '@/components/page-parts/JobProgressBar';
import { OutputLocationPicker } from '@/components/page-parts/OutputLocationPicker';
import { ProcessButton } from '@/components/page-parts/ProcessButton';
import { ResultsBanner } from '@/components/page-parts/ResultsBanner';
import { ResultsList } from '@/components/page-parts/ResultsList';
import { ThumbnailStrip } from '@/components/page-parts/ThumbnailStrip';
import { useImagePreview } from '@/hooks/useImagePreview';
import {
  effectsList,
  type EffectResult,
  type EffectType,
  type ImageInfo,
  type OperationHistoryItem,
} from '@/types/image';
import type { EffectPreviewOptions } from '@/components/EffectsPreview';
import {
  defaultFormValues,
  effectsFormSchema,
  type EffectsFormValues,
} from './_components/schema';
import { EmptyState } from './_components/EmptyState';
import { EffectPicker } from './_components/EffectPicker';
import { IntensityControl } from './_components/IntensityControl';
import { PreviewPane } from './_components/PreviewPane';
import { runEffects } from './_components/useEffectsExecution';

type EffectsPageProps = {
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

const EffectsPage = ({ onOperationComplete }: EffectsPageProps) => {
  const form = useForm<EffectsFormValues>({
    resolver: zodResolver(effectsFormSchema),
    defaultValues: defaultFormValues,
    mode: 'onChange',
  });
  usePersistedFormDefaults({
    page: 'effects',
    form,
    baseDefaults: defaultFormValues,
    persistKeys: ['selectedEffect', 'intensity', 'outputDir'],
  });
  const { control } = form;
  const selectedEffect = useWatch({ control, name: 'selectedEffect' });
  const intensity = useWatch({ control, name: 'intensity' });
  const outputDir = useWatch({ control, name: 'outputDir' });

  const [images, setImages] = useState<ImageInfo[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [results, setResults] = useState<EffectResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const progress = useImageProgress(isProcessing);

  const previewImage = images[previewIndex];
  const { src: previewSrc, isLoading: isLoadingPreview } = useImagePreview(previewImage);

  const previewOptions = useMemo<EffectPreviewOptions>(
    () => ({ effect: selectedEffect, intensity }),
    [selectedEffect, intensity]
  );

  const handleImagesChange = (imgs: ImageInfo[]) => {
    setImages(imgs);
    if (previewIndex >= imgs.length) setPreviewIndex(Math.max(0, imgs.length - 1));
  };

  const handleRemove = (index: number) => {
    const next = images.filter((_, i) => i !== index);
    setImages(next);
    if (previewIndex >= next.length) setPreviewIndex(Math.max(0, next.length - 1));
  };

  const handleApply = () =>
    runEffects({
      images,
      values: form.getValues(),
      onStart: () => {
        setIsProcessing(true);
        setShowResults(false);
      },
      onFinish: (r) => {
        setIsProcessing(false);
        setResults(r);
        setShowResults(true);
      },
      onOperationComplete,
    });

  const successCount = results.filter((r) => r.success).length;
  const selectedEffectInfo = effectsList.find((e) => e.type === selectedEffect);

  useKeyboardShortcut('Enter', handleApply, {
    meta: true,
    enabled: images.length > 0 && !isProcessing,
  });
  useKeyboardShortcut('Escape', () => invoke('cancel_image_jobs'), { enabled: isProcessing });

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
            <EffectPicker
              value={selectedEffect}
              onChange={(effect: EffectType) =>
                form.setValue('selectedEffect', effect, { shouldValidate: true })
              }
            />

            <IntensityControl
              value={intensity}
              onChange={(v) => form.setValue('intensity', v, { shouldValidate: true })}
            />

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

            {isProcessing && images.length > 0 && (
              <JobProgressBar
                items={images.map((img) => ({ path: img.path, name: img.name }))}
                progress={progress}
                running={isProcessing}
                verb="Applying"
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
                    subtitle={`${successCount}/${results.length} processed`}
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
              isProcessing={isProcessing}
              disabled={images.length === 0}
              onClick={handleApply}
              icon={Wand2}
              label={`Apply ${selectedEffectInfo?.label ?? ''}`}
              processingLabel="Processing..."
              size="sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

EffectsPage.displayName = 'EffectsPage';

export { EffectsPage };
