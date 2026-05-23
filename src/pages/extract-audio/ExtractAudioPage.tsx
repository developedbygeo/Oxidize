import { useReducer } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music } from 'lucide-react';
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
import { audioFormatLabels, isLosslessAudioFormat } from '@/types/video';
import type { OperationHistoryItem } from '@/types/image';
import {
  initialState,
  extractAudioReducer,
  formatFileSize,
} from './_components/schema';
import { AudioFormatPicker } from './_components/AudioFormatPicker';
import { BitratePicker } from './_components/BitratePicker';
import { runExtractAudio } from './_components/useExtractAudioExecution';

type ExtractAudioPageProps = {
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

const ExtractAudioPage = ({ onOperationComplete }: ExtractAudioPageProps) => {
  const [state, dispatch] = useReducer(extractAudioReducer, initialState);
  const {
    videos,
    targetFormat,
    bitrateKbps,
    outputDir,
    isExtracting,
    results,
    showResults,
  } = state;

  const progress = useFfmpegProgress(isExtracting);
  const lossless = isLosslessAudioFormat(targetFormat);

  const handleExtract = () =>
    runExtractAudio({
      videos,
      targetFormat,
      bitrateKbps,
      outputDir,
      onStart: () => dispatch({ type: 'START_EXTRACTING' }),
      onFinish: (r) => dispatch({ type: 'FINISH_EXTRACTING', payload: r }),
      onOperationComplete,
    });

  const successCount = results.filter((r) => r.success).length;

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-5">
        <PageHeader
          icon={Music}
          title="Extract Audio"
          description="Pull the audio track out of a video"
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
              <AudioFormatPicker
                value={targetFormat}
                onChange={(f) => dispatch({ type: 'SET_TARGET_FORMAT', payload: f })}
              />

              <AnimatePresence>
                {!lossless && (
                  <motion.div
                    variants={expandHeight}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <BitratePicker
                      value={bitrateKbps}
                      onChange={(v) => dispatch({ type: 'SET_BITRATE', payload: v })}
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
                isProcessing={isExtracting}
                disabled={videos.length === 0}
                onClick={handleExtract}
                icon={Music}
                label={`Extract audio as ${audioFormatLabels[targetFormat]}`}
                processingLabel="Extracting..."
              />
            </motion.div>
          )}
        </AnimatePresence>

        {isExtracting && videos.length > 0 && (
          <JobProgressBar
            items={videos.map((v) => ({ path: v.path, name: v.name }))}
            progress={progress}
            running={isExtracting}
            verb="Extracting from"
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
                subtitle={`${successCount}/${results.length} extracted`}
              />
              <ResultsList results={results}>
                {(result) => (
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatFileSize(result.new_size)}
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

ExtractAudioPage.displayName = 'ExtractAudioPage';

export { ExtractAudioPage };
