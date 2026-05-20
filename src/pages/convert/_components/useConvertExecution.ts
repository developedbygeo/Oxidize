import { invoke } from '@tauri-apps/api/core';
import { resolveOutputDir } from '@/lib/utils';
import { createProcessToast } from '@/lib/process-toast';
import { formatLabels } from '@/types/image';
import type {
  ConversionResult,
  ImageInfo,
  ImageFormat,
  OperationHistoryItem,
} from '@/types/image';

type ExecuteArgs = {
  images: ImageInfo[];
  targetFormat: ImageFormat;
  quality: number;
  outputDir: string | null;
};

export const convertImages = async (args: ExecuteArgs): Promise<ConversionResult[]> => {
  const { images, targetFormat, quality, outputDir } = args;
  return invoke<ConversionResult[]>('convert_images_batch', {
    inputPaths: images.map((img) => img.path),
    options: { format: targetFormat, quality, output_dir: outputDir },
  });
};

type RunConversionArgs = ExecuteArgs & {
  onStart: () => void;
  onFinish: (results: ConversionResult[]) => void;
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

export const runConversion = async ({
  onStart,
  onFinish,
  onOperationComplete,
  ...args
}: RunConversionArgs) => {
  if (args.images.length === 0) return;

  onStart();
  const processToast = createProcessToast({
    progressLabel: 'Converting',
    doneLabel: 'Conversion',
    itemCount: args.images.length,
  });

  try {
    const results = await convertImages(args);
    onFinish(results);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;
    const totalSaved = results.reduce((acc, r) => acc + (r.original_size - r.new_size), 0);

    processToast.finish({
      successCount,
      failCount,
      extraInfo: `converted to ${formatLabels[args.targetFormat]}`,
    });

    if (successCount > 0 && onOperationComplete) {
      const dir = resolveOutputDir({
        results: results.filter((r) => r.success),
        fallbackDir: args.outputDir,
        fallbackPath: args.images[0]?.path,
      });

      onOperationComplete({
        type: 'convert',
        fileCount: successCount,
        outputDir: dir,
        details: `Converted to ${formatLabels[args.targetFormat]}`,
        totalSaved: totalSaved > 0 ? totalSaved : undefined,
      });
    }
  } catch (error) {
    console.error('Conversion failed:', error);
    processToast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    onFinish([]);
  }
};
