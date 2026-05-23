import { useReducer } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileVideo, Sparkles } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { fadeUp, expandHeight } from '@/lib/animations';
import { PageHeader } from '@/components/page-parts/PageHeader';
import { OutputLocationPicker } from '@/components/page-parts/OutputLocationPicker';
import { ProcessButton } from '@/components/page-parts/ProcessButton';
import { ResultsBanner } from '@/components/page-parts/ResultsBanner';
import { ResultsList } from '@/components/page-parts/ResultsList';
import { JobProgressBar } from '@/components/page-parts/JobProgressBar';
import { VideoDropzone } from '@/components/VideoDropzone';
import { useFfmpegProgress } from '@/hooks/useFfmpegProgress';
import { videoFormatLabels } from '@/types/video';
import type { OperationHistoryItem } from '@/types/image';
import {
  initialState,
  videoConvertReducer,
  formatFileSize,
} from './_components/schema';
import { VideoFormatPicker } from './_components/VideoFormatPicker';
import { ModePicker } from './_components/ModePicker';
import { CrfSlider } from './_components/CrfSlider';
import { runVideoConvert } from './_components/useVideoConvertExecution';

type VideoConvertPageProps = {
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

const VideoConvertPage = ({ onOperationComplete }: VideoConvertPageProps) => {
  const [state, dispatch] = useReducer(videoConvertReducer, initialState);
  const {
    videos,
    targetFormat,
    mode,
    crf,
    outputDir,
    isConverting,
    results,
    showResults,
  } = state;

  const progress = useFfmpegProgress(isConverting);

  const handleConvert = () =>
    runVideoConvert({
      videos,
      targetFormat,
      mode,
      crf,
      outputDir,
      onStart: () => dispatch({ type: 'START_CONVERTING' }),
      onFinish: (r) => dispatch({ type: 'FINISH_CONVERTING', payload: r }),
      onOperationComplete,
    });

  const successCount = results.filter((r) => r.success).length;

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-5">
        <PageHeader
          icon={FileVideo}
          title="Video Convert"
          description="Change video format and container"
        />

        <VideoDropzone
          videos={videos}
          onVideosChange={(v) => dispatch({ type: 'SET_VIDEOS', payload: v })}
        />

        <AnimatePresence>
          {videos.length > 0 && (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-5"
            >
              <VideoFormatPicker
                value={targetFormat}
                onChange={(format) => dispatch({ type: 'SET_TARGET_FORMAT', payload: format })}
              />

              <ModePicker
                value={mode}
                onChange={(m) => dispatch({ type: 'SET_MODE', payload: m })}
              />

              <AnimatePresence>
                {mode === 'reencode' && (
                  <motion.div
                    variants={expandHeight}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <CrfSlider
                      value={crf}
                      onChange={(v) => dispatch({ type: 'SET_CRF', payload: v })}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Output Location
                </label>
                <OutputLocationPicker
                  value={outputDir}
                  onChange={(dir) => dispatch({ type: 'SET_OUTPUT_DIR', payload: dir })}
                  size="md"
                />
              </div>

              <ProcessButton
                isProcessing={isConverting}
                disabled={videos.length === 0}
                onClick={handleConvert}
                icon={Sparkles}
                label={`Convert ${videos.length} video${videos.length !== 1 ? 's' : ''} to ${videoFormatLabels[targetFormat]}`}
                processingLabel="Converting..."
              />
            </motion.div>
          )}
        </AnimatePresence>

        {isConverting && videos.length > 0 && (
          <JobProgressBar
            items={videos.map((v) => ({ path: v.path, name: v.name }))}
            progress={progress}
            running={isConverting}
            verb="Converting"
            itemName="video"
            onCancel={() => invoke('cancel_video_jobs')}
          />
        )}

        <AnimatePresence>
          {showResults && results.length > 0 && (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-3"
            >
              <ResultsBanner
                title="Complete"
                subtitle={`${successCount}/${results.length} converted`}
              />
              <ResultsList results={results}>
                {(result) => (
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatFileSize(result.original_size)} → {formatFileSize(result.new_size)}
                  </span>
                )}
              </ResultsList>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

VideoConvertPage.displayName = 'VideoConvertPage';

export { VideoConvertPage };
