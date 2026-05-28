import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Film, Zap } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fadeUp, expandHeight } from '@/lib/animations';
import { PageHeader } from '@/components/page-parts/PageHeader';
import { OutputLocationPicker } from '@/components/page-parts/OutputLocationPicker';
import { ProcessButton } from '@/components/page-parts/ProcessButton';
import { ResultsBanner } from '@/components/page-parts/ResultsBanner';
import { ResultsList } from '@/components/page-parts/ResultsList';
import { JobProgressBar } from '@/components/page-parts/JobProgressBar';
import { VideoDropzone } from '@/components/VideoDropzone';
import { useFfmpegProgress } from '@/hooks/useFfmpegProgress';
import type {
  VideoFormat,
  VideoInfo,
  VideoQualityMode,
  VideoResult,
} from '@/types/video';
import type { OperationHistoryItem } from '@/types/image';
import {
  defaultFormValues,
  formatFileSize,
  videoCompressFormSchema,
  type VideoCompressFormValues,
  type VideoEncodingPreset,
} from './_components/schema';
import { FormatPicker } from './_components/FormatPicker';
import { QualityModePicker } from './_components/QualityModePicker';
import { CrfControl } from './_components/CrfControl';
import { BitrateControl } from './_components/BitrateControl';
import { PresetPicker } from './_components/PresetPicker';
import { runVideoCompress } from './_components/useVideoCompressExecution';

type VideoCompressPageProps = {
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

const VideoCompressPage = ({ onOperationComplete }: VideoCompressPageProps) => {
  const form = useForm<VideoCompressFormValues>({
    resolver: zodResolver(videoCompressFormSchema),
    defaultValues: defaultFormValues,
    mode: 'onChange',
  });
  const { control } = form;
  const targetFormat = useWatch({ control, name: 'targetFormat' });
  const mode = useWatch({ control, name: 'mode' });
  const crf = useWatch({ control, name: 'crf' });
  const bitrateKbps = useWatch({ control, name: 'bitrateKbps' });
  const preset = useWatch({ control, name: 'preset' });
  const outputDir = useWatch({ control, name: 'outputDir' });

  const [videos, setVideos] = useState<VideoInfo[]>([]);
  const [results, setResults] = useState<VideoResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  const progress = useFfmpegProgress(isCompressing);

  const handleCompress = () =>
    runVideoCompress({
      videos,
      values: form.getValues(),
      onStart: () => {
        setIsCompressing(true);
        setShowResults(false);
      },
      onFinish: (r) => {
        setIsCompressing(false);
        setResults(r);
        setShowResults(true);
      },
      onOperationComplete,
    });

  const successCount = results.filter((r) => r.success).length;
  const totalOriginal = results.reduce((acc, r) => acc + r.original_size, 0);
  const totalNew = results.reduce((acc, r) => acc + r.new_size, 0);
  const totalSaved = Math.max(0, totalOriginal - totalNew);

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-5">
        <PageHeader
          icon={Film}
          title="Video Compress"
          description="Shrink video files with CRF or a target bitrate"
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
              <FormatPicker
                value={targetFormat as VideoFormat}
                onChange={(format) =>
                  form.setValue('targetFormat', format, { shouldValidate: true })
                }
              />

              <QualityModePicker
                value={mode}
                onChange={(m: VideoQualityMode) =>
                  form.setValue('mode', m, { shouldValidate: true })
                }
              />

              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  variants={expandHeight}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {mode === 'crf' ? (
                    <CrfControl
                      value={crf}
                      onChange={(v) => form.setValue('crf', v, { shouldValidate: true })}
                    />
                  ) : (
                    <BitrateControl
                      value={bitrateKbps}
                      onChange={(v) => form.setValue('bitrateKbps', v, { shouldValidate: true })}
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              <PresetPicker
                value={preset}
                onChange={(p: VideoEncodingPreset) =>
                  form.setValue('preset', p, { shouldValidate: true })
                }
              />

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
                isProcessing={isCompressing}
                disabled={videos.length === 0}
                onClick={handleCompress}
                icon={Zap}
                label={`Compress ${videos.length} video${videos.length !== 1 ? 's' : ''}`}
                processingLabel="Compressing..."
              />
            </motion.div>
          )}
        </AnimatePresence>

        {isCompressing && videos.length > 0 && (
          <JobProgressBar
            items={videos.map((v) => ({ path: v.path, name: v.name }))}
            progress={progress}
            running={isCompressing}
            verb="Compressing"
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
                subtitle={`${successCount}/${results.length} compressed${
                  totalSaved > 0 ? ` · ${formatFileSize(totalSaved)} saved` : ''
                }`}
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

VideoCompressPage.displayName = 'VideoCompressPage';

export { VideoCompressPage };
