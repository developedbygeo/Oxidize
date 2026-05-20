import { useReducer, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wand2 } from 'lucide-react';
import { fadeUp } from '@/lib/animations';
import { OutputLocationPicker } from '@/components/page-parts/OutputLocationPicker';
import { ProcessButton } from '@/components/page-parts/ProcessButton';
import { ResultsBanner } from '@/components/page-parts/ResultsBanner';
import { ResultsList } from '@/components/page-parts/ResultsList';
import { ThumbnailStrip } from '@/components/page-parts/ThumbnailStrip';
import { useImagePreview } from '@/hooks/useImagePreview';
import { effectsList, type OperationHistoryItem } from '@/types/image';
import type { EffectPreviewOptions } from '@/components/EffectsPreview';
import { effectsReducer, initialState } from './_components/schema';
import { EmptyState } from './_components/EmptyState';
import { EffectPicker } from './_components/EffectPicker';
import { IntensityControl } from './_components/IntensityControl';
import { PreviewPane } from './_components/PreviewPane';
import { runEffects } from './_components/useEffectsExecution';

type EffectsPageProps = {
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
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
  } = state;

  const previewImage = images[previewIndex];
  const { src: previewSrc, isLoading: isLoadingPreview } = useImagePreview(previewImage);

  const previewOptions = useMemo<EffectPreviewOptions>(
    () => ({ effect: selectedEffect, intensity }),
    [selectedEffect, intensity]
  );

  const handleApply = () =>
    runEffects({
      images,
      selectedEffect,
      intensity,
      outputDir,
      onStart: () => dispatch({ type: 'START_PROCESSING' }),
      onFinish: (r) => dispatch({ type: 'FINISH_PROCESSING', payload: r }),
      onOperationComplete,
    });

  const successCount = results.filter((r) => r.success).length;
  const selectedEffectInfo = effectsList.find((e) => e.type === selectedEffect);

  if (images.length === 0) {
    return (
      <EmptyState
        onImagesChange={(imgs) => {
          dispatch({ type: 'SET_IMAGES', payload: imgs });
          dispatch({ type: 'SET_PREVIEW_INDEX', payload: 0 });
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
            onSelect={(i) => dispatch({ type: 'SET_PREVIEW_INDEX', payload: i })}
            onRemove={(i) => dispatch({ type: 'REMOVE_IMAGE', payload: i })}
            onImagesChange={(imgs) => dispatch({ type: 'SET_IMAGES', payload: imgs })}
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
              onChange={(effect) => dispatch({ type: 'SET_SELECTED_EFFECT', payload: effect })}
            />

            <IntensityControl
              value={intensity}
              onChange={(v) => dispatch({ type: 'SET_INTENSITY', payload: v })}
            />

            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Output
              </label>
              <OutputLocationPicker
                value={outputDir}
                onChange={(dir) => dispatch({ type: 'SET_OUTPUT_DIR', payload: dir })}
                size="sm"
              />
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
                  <ResultsBanner
                    title="Complete"
                    subtitle={`${successCount}/${results.length} processed`}
                    size="sm"
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
