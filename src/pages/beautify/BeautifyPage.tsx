import { useReducer, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { fadeUp } from '@/lib/animations';
import { OutputLocationPicker } from '@/components/page-parts/OutputLocationPicker';
import { ProcessButton } from '@/components/page-parts/ProcessButton';
import { ResultsBanner } from '@/components/page-parts/ResultsBanner';
import { ResultsList } from '@/components/page-parts/ResultsList';
import { ThumbnailStrip } from '@/components/page-parts/ThumbnailStrip';
import { useImagePreview } from '@/hooks/useImagePreview';
import type { PreviewOptions } from '@/components/ImagePreview';
import type { OperationHistoryItem } from '@/types/image';
import { beautifyReducer, initialState } from './_components/schema';
import { BasicAdjustmentsPanel } from './_components/BasicAdjustmentsPanel';
import { ColorCorrectionPanel } from './_components/ColorCorrectionPanel';
import { EmptyState } from './_components/EmptyState';
import { PreviewPane } from './_components/PreviewPane';
import { runBeautify } from './_components/useBeautifyExecution';

type BeautifyPageProps = {
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
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
  } = state;

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
    [adjustments]
  );

  const handleBeautify = () =>
    runBeautify({
      images,
      adjustments,
      outputDir,
      onStart: () => dispatch({ type: 'START_BEAUTIFYING' }),
      onFinish: (r) => dispatch({ type: 'FINISH_BEAUTIFYING', payload: r }),
      onOperationComplete,
    });

  const successCount = results.filter((r) => r.success).length;

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
            <BasicAdjustmentsPanel
              adjustments={adjustments}
              onChange={(patch) => dispatch({ type: 'SET_ADJUSTMENT', payload: patch })}
              onReset={() => dispatch({ type: 'RESET_ADJUSTMENTS' })}
            />

            <ColorCorrectionPanel
              adjustments={adjustments}
              onChange={(patch) => dispatch({ type: 'SET_ADJUSTMENT', payload: patch })}
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
                    subtitle={`${successCount}/${results.length} enhanced`}
                    size="sm"
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
