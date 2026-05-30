import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileVideo, Sparkles } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fadeUp, expandHeight } from '@/lib/animations';
import { resolveOutputDir } from '@/lib/utils';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { usePersistedFormDefaults } from '@/hooks/usePersistedFormDefaults';
import { PageHeader } from '@/components/page-parts/PageHeader';
import { OutputLocationPicker } from '@/components/page-parts/OutputLocationPicker';
import { ProcessButton } from '@/components/page-parts/ProcessButton';
import { ResultsBanner } from '@/components/page-parts/ResultsBanner';
import { ResultsList } from '@/components/page-parts/ResultsList';
import { JobProgressBar } from '@/components/page-parts/JobProgressBar';
import { VideoDropzone } from '@/components/VideoDropzone';
import { useFfmpegProgress } from '@/hooks/useFfmpegProgress';
import {
  videoFormatLabels,
  type VideoFormat,
  type VideoInfo,
  type VideoResult,
} from '@/types/video';
import type { OperationHistoryItem } from '@/types/image';
import {
  defaultFormValues,
  formatFileSize,
  videoConvertFormSchema,
  type VideoConvertFormValues,
} from './_components/schema';
import { VideoFormatPicker } from './_components/VideoFormatPicker';
import { ModePicker, type ConvertMode } from './_components/ModePicker';
import { CrfSlider } from './_components/CrfSlider';
import { runVideoConvert } from './_components/useVideoConvertExecution';

type VideoConvertPageProps = {
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

const VideoConvertPage = ({ onOperationComplete }: VideoConvertPageProps) => {
  const form = useForm<VideoConvertFormValues>({
    resolver: zodResolver(videoConvertFormSchema),
    defaultValues: defaultFormValues,
    mode: 'onChange',
  });
  usePersistedFormDefaults({
    page: 'video-convert',
    form,
    baseDefaults: defaultFormValues,
    persistKeys: ['targetFormat', 'mode', 'crf', 'outputDir'],
  });
  const { control } = form;
  const targetFormat = useWatch({ control, name: 'targetFormat' });
  const mode = useWatch({ control, name: 'mode' });
  const crf = useWatch({ control, name: 'crf' });
  const outputDir = useWatch({ control, name: 'outputDir' });

  const [videos, setVideos] = useState<VideoInfo[]>([]);
  const [results, setResults] = useState<VideoResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  const progress = useFfmpegProgress(isConverting);

  const handleConvert = () =>
    runVideoConvert({
      videos,
      values: form.getValues(),
      onStart: () => {
        setIsConverting(true);
        setShowResults(false);
      },
      onFinish: (r) => {
        setIsConverting(false);
        setResults(r);
        setShowResults(true);
      },
      onOperationComplete,
    });

  const successCount = results.filter((r) => r.success).length;

  useKeyboardShortcut('Enter', handleConvert, {
    meta: true,
    enabled: videos.length > 0 && !isConverting,
  });
  useKeyboardShortcut('Escape', () => invoke('cancel_video_jobs'), { enabled: isConverting });

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-5">
        <PageHeader
          icon={FileVideo}
          title="Video Convert"
          description="Change video format and container"
        />

        <VideoDropzone videos={videos} onVideosChange={setVideos} />

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
                value={targetFormat as VideoFormat}
                onChange={(format) =>
                  form.setValue('targetFormat', format, { shouldValidate: true })
                }
              />

              <ModePicker
                value={mode}
                onChange={(m: ConvertMode) => form.setValue('mode', m, { shouldValidate: true })}
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
                      onChange={(v) => form.setValue('crf', v, { shouldValidate: true })}
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
                  onChange={(dir) => form.setValue('outputDir', dir, { shouldValidate: true })}
                  size="md"
                />
              </div>

              <ProcessButton
                isProcessing={isConverting}
                disabled={videos.length === 0}
                onClick={handleConvert}
                icon={Sparkles}
                label={`Convert ${videos.length} video${videos.length !== 1 ? 's' : ''} to ${videoFormatLabels[targetFormat as VideoFormat]}`}
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
                outputDir={resolveOutputDir({ results, fallbackDir: outputDir })}
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
