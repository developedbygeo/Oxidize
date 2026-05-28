import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Scissors } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import { fadeUp, expandHeight } from '@/lib/animations';
import { PageHeader } from '@/components/page-parts/PageHeader';
import { OutputLocationPicker } from '@/components/page-parts/OutputLocationPicker';
import { ProcessButton } from '@/components/page-parts/ProcessButton';
import { ResultsBanner } from '@/components/page-parts/ResultsBanner';
import { ResultsList } from '@/components/page-parts/ResultsList';
import { JobProgressBar } from '@/components/page-parts/JobProgressBar';
import { VideoDropzone } from '@/components/VideoDropzone';
import { Slider } from '@/components/ui/slider';
import { useFfmpegProgress } from '@/hooks/useFfmpegProgress';
import { crfToQuality, qualityToCrf } from '@/lib/video-quality';
import type { VideoInfo, VideoResult, VideoTrimMode } from '@/types/video';
import type { OperationHistoryItem } from '@/types/image';
import {
  defaultFormValues,
  formatFileSize,
  trimsForVideos,
  videoTrimFormSchema,
  type TrimSpec,
  type VideoTrimFormValues,
} from './_components/schema';
import { TrimModePicker } from './_components/TrimModePicker';
import { VideoPlayer } from './_components/VideoPlayer';
import { TrimRange } from './_components/TrimRange';
import { VideoTabs } from './_components/VideoTabs';
import { runVideoTrim } from './_components/useVideoTrimExecution';

type VideoTrimPageProps = {
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

const VideoTrimPage = ({ onOperationComplete }: VideoTrimPageProps) => {
  const form = useForm<VideoTrimFormValues>({
    resolver: zodResolver(videoTrimFormSchema),
    defaultValues: defaultFormValues,
    mode: 'onChange',
  });
  const { control } = form;
  const mode = useWatch({ control, name: 'mode' });
  const crf = useWatch({ control, name: 'crf' });
  const outputDir = useWatch({ control, name: 'outputDir' });

  // Trim points are keyed by file path — dynamic shape, not a natural fit
  // for RHF. Stays as plain useState.
  const [videos, setVideos] = useState<VideoInfo[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [trims, setTrims] = useState<Record<string, TrimSpec>>({});
  const [currentTime, setCurrentTime] = useState(0);
  const [results, setResults] = useState<VideoResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isTrimming, setIsTrimming] = useState(false);

  const progress = useFfmpegProgress(isTrimming);
  const activeVideo = videos[activeIndex];
  const activeTrim = activeVideo ? trims[activeVideo.path] : null;
  const quality = crfToQuality(crf);

  const handleVideosChange = (next: VideoInfo[]) => {
    setVideos(next);
    setTrims((prev) => trimsForVideos(prev, next));
    if (activeIndex >= next.length) setActiveIndex(Math.max(0, next.length - 1));
    setCurrentTime(0);
  };

  const handleActiveIndexChange = (i: number) => {
    setActiveIndex(i);
    setCurrentTime(0);
  };

  const updateTrim = (path: string, patch: Partial<TrimSpec>) => {
    setTrims((prev) => {
      const existing = prev[path];
      if (!existing) return prev;
      return { ...prev, [path]: { ...existing, ...patch } };
    });
  };

  const handleTrim = () =>
    runVideoTrim({
      videos,
      trims,
      values: form.getValues(),
      onStart: () => {
        setIsTrimming(true);
        setShowResults(false);
      },
      onFinish: (r) => {
        setIsTrimming(false);
        setResults(r);
        setShowResults(true);
      },
      onOperationComplete,
    });

  const successCount = results.filter((r) => r.success).length;

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-5">
        <PageHeader
          icon={Scissors}
          title="Video Trim"
          description="Cut a portion out of a video"
        />

        <VideoDropzone videos={videos} onVideosChange={handleVideosChange} />

        <AnimatePresence>
          {activeVideo && activeTrim && (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-5"
            >
              <VideoTabs
                videos={videos}
                activeIndex={activeIndex}
                trims={trims}
                onSelect={handleActiveIndexChange}
              />

              <VideoPlayer
                key={activeVideo.path}
                video={activeVideo}
                onTimeUpdate={setCurrentTime}
              />

              <TrimRange
                duration={activeVideo.duration_seconds}
                start={activeTrim.start}
                end={activeTrim.end}
                currentTime={currentTime}
                onStartChange={(v) => updateTrim(activeVideo.path, { start: v })}
                onEndChange={(v) => updateTrim(activeVideo.path, { end: v })}
              />

              <TrimModePicker
                value={mode}
                onChange={(m: VideoTrimMode) =>
                  form.setValue('mode', m, { shouldValidate: true })
                }
              />

              <AnimatePresence>
                {mode === 'accurate' && (
                  <motion.div
                    variants={expandHeight}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Re-encode quality
                      </label>
                      <div className="flex items-baseline gap-2">
                        <span
                          className={cn(
                            'text-xs font-mono tabular-nums',
                            quality >= 60
                              ? 'text-primary'
                              : quality <= 40
                              ? 'text-destructive'
                              : 'text-muted-foreground'
                          )}
                        >
                          {quality}%
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground/60">
                          CRF {crf}
                        </span>
                      </div>
                    </div>
                    <Slider
                      value={[quality]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={(values) =>
                        form.setValue('crf', qualityToCrf(values[0]), { shouldValidate: true })
                      }
                      className="**:data-[slot=slider-range]:bg-primary **:data-[slot=slider-thumb]:border-primary"
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
                isProcessing={isTrimming}
                disabled={videos.length === 0}
                onClick={handleTrim}
                icon={Scissors}
                label={`Trim ${videos.length} video${videos.length !== 1 ? 's' : ''}`}
                processingLabel="Trimming..."
              />
            </motion.div>
          )}
        </AnimatePresence>

        {isTrimming && videos.length > 0 && (
          <JobProgressBar
            items={videos.map((v) => ({ path: v.path, name: v.name }))}
            progress={progress}
            running={isTrimming}
            verb="Trimming"
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
                subtitle={`${successCount}/${results.length} trimmed`}
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

VideoTrimPage.displayName = 'VideoTrimPage';

export { VideoTrimPage };
