import { invoke } from '@tauri-apps/api/core';
import { resolveOutputDir } from '@/lib/utils';
import { createProcessToast } from '@/lib/process-toast';
import { isCancelledError, isSkippedError } from '@/lib/ffmpeg-errors';
import { firstImageError, humanizeImageError } from '@/lib/image-errors';
import { humanizeFfmpegError } from '@/lib/ffmpeg-errors';
import { toOutputNaming } from '@/types/output-naming';
import type {
  ImageInfo,
  OperationHistoryItem,
  ResizeOptions,
  ResizeResult,
} from '@/types/image';
import type { VideoInfo, VideoResizeOptions, VideoResult } from '@/types/video';
import { PLATFORM_LABELS, type SocialPreset } from '@/lib/social-presets';

type CommonFields = {
  outputDir: string | null;
  filenameTemplate: string;
  overwriteMode: 'auto-number' | 'skip' | 'overwrite';
};

type RunArgs = {
  preset: SocialPreset;
  images: ImageInfo[];
  videos: VideoInfo[];
  fields: CommonFields;
  onStart: () => void;
  onFinish: () => void;
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

const summarize = (preset: SocialPreset): string =>
  `${PLATFORM_LABELS[preset.platform]} · ${preset.name} (${preset.width}×${preset.height})`;

const runImagePreset = async ({
  preset,
  images,
  fields,
  onOperationComplete,
}: Pick<RunArgs, 'preset' | 'images' | 'fields' | 'onOperationComplete'>) => {
  const processToast = createProcessToast({
    progressLabel: 'Applying preset to',
    doneLabel: 'Social preset',
    itemCount: images.length,
  });
  try {
    // Cover fit is the right answer for social presets — landscape source
    // into vertical Instagram Reel etc. fills the target and centre-crops
    // the overflow rather than distorting.
    const options: ResizeOptions = {
      width: preset.width,
      height: preset.height,
      fit: 'cover',
      output_dir: fields.outputDir,
      naming: toOutputNaming(fields.filenameTemplate, fields.overwriteMode),
    };
    const results = await invoke<ResizeResult[]>('resize_images_batch', {
      inputPaths: images.map((img) => img.path),
      options,
    });

    const successCount = results.filter((r) => r.success).length;
    const cancelledCount = results.filter((r) => isCancelledError(r.error)).length;
    const skippedCount = results.filter((r) => isSkippedError(r.error)).length;
    const failCount = results.length - successCount - cancelledCount - skippedCount;

    if (cancelledCount > 0) {
      processToast.cancelled(successCount);
    } else if (skippedCount > 0 && failCount === 0) {
      processToast.skipped({ successCount, skipCount: skippedCount });
    } else {
      processToast.finish({
        successCount,
        failCount,
        firstError: firstImageError(results),
      });
    }

    if (successCount > 0 && onOperationComplete) {
      const dir = resolveOutputDir({
        results: results.filter((r) => r.success),
        fallbackDir: fields.outputDir,
        fallbackPath: images[0]?.path,
      });
      onOperationComplete({
        type: 'social',
        fileCount: successCount,
        outputDir: dir,
        details: summarize(preset),
      });
    }
  } catch (error) {
    console.error('Social image preset failed:', error);
    const friendly = humanizeImageError(error);
    processToast.error({ title: friendly.title, description: friendly.details });
  }
};

const runVideoPreset = async ({
  preset,
  videos,
  fields,
  onOperationComplete,
}: Pick<RunArgs, 'preset' | 'videos' | 'fields' | 'onOperationComplete'>) => {
  const processToast = createProcessToast({
    progressLabel: 'Applying preset to',
    doneLabel: 'Social preset',
    itemCount: videos.length,
    itemName: 'video',
  });
  try {
    // Known limitation (documented in ROADMAP "Video FitMode" follow-up):
    // resize_videos_batch with maintain_aspect=false STRETCHES to the
    // exact target. A landscape source going into a vertical preset will
    // distort. Until the video-side fit mode lands, document via toast
    // copy and ROADMAP. For images we already have Cover (above).
    const options: VideoResizeOptions = {
      format: preset.videoFormat ?? 'mp4',
      mode: 'custom',
      target_height: null,
      width: preset.width,
      height: preset.height,
      maintain_aspect: false,
      crf: preset.videoCrf ?? 23,
      output_dir: fields.outputDir,
    };
    const results = await invoke<VideoResult[]>('resize_videos_batch', {
      inputPaths: videos.map((v) => v.path),
      options,
    });

    const successCount = results.filter((r) => r.success).length;
    const cancelledCount = results.filter((r) => isCancelledError(r.error)).length;
    const failCount = results.length - successCount - cancelledCount;

    if (cancelledCount > 0) {
      processToast.cancelled(successCount);
    } else {
      processToast.finish({ successCount, failCount });
    }

    if (successCount > 0 && onOperationComplete) {
      const dir = resolveOutputDir({
        results: results.filter((r) => r.success),
        fallbackDir: fields.outputDir,
        fallbackPath: videos[0]?.path,
      });
      onOperationComplete({
        type: 'social',
        fileCount: successCount,
        outputDir: dir,
        details: summarize(preset),
      });
    }
  } catch (error) {
    console.error('Social video preset failed:', error);
    if (isCancelledError(error)) {
      processToast.cancelled(0);
      return;
    }
    const friendly = humanizeFfmpegError(error);
    processToast.error({ title: friendly.title, description: friendly.details });
  }
};

export const runSocialPreset = async (args: RunArgs) => {
  const { preset, images, videos } = args;
  const itemCount = preset.mediaType === 'image' ? images.length : videos.length;
  if (itemCount === 0) return;

  args.onStart();
  try {
    if (preset.mediaType === 'image') {
      await runImagePreset({
        preset,
        images,
        fields: args.fields,
        onOperationComplete: args.onOperationComplete,
      });
    } else {
      await runVideoPreset({
        preset,
        videos,
        fields: args.fields,
        onOperationComplete: args.onOperationComplete,
      });
    }
  } finally {
    args.onFinish();
  }
};
