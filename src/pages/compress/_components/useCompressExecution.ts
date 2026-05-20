import { invoke } from '@tauri-apps/api/core';
import { resolveOutputDir } from '@/lib/utils';
import { createProcessToast } from '@/lib/process-toast';
import type { CompressionResult, ImageInfo, OperationHistoryItem } from '@/types/image';
import { compressionPresets, type CompressionLevel } from './schema';

type RunCompressionArgs = {
  images: ImageInfo[];
  quality: number;
  outputDir: string | null;
  compressionLevel: CompressionLevel;
  useCustom: boolean;
  customQuality: number;
  onStart: () => void;
  onFinish: (results: CompressionResult[]) => void;
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

export const runCompression = async ({
  images,
  quality,
  outputDir,
  compressionLevel,
  useCustom,
  customQuality,
  onStart,
  onFinish,
  onOperationComplete,
}: RunCompressionArgs) => {
  if (images.length === 0) return;

  onStart();
  const processToast = createProcessToast({
    progressLabel: 'Compressing',
    doneLabel: 'Compression',
    itemCount: images.length,
  });

  try {
    const results = await invoke<CompressionResult[]>('compress_images_batch', {
      inputPaths: images.map((img) => img.path),
      options: { quality, output_dir: outputDir },
    });
    onFinish(results);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;
    const totalSavedBytes = results.reduce((acc, r) => acc + (r.original_size - r.new_size), 0);
    const avgSavingsPercent =
      results.length > 0
        ? results.reduce((acc, r) => acc + r.savings_percent, 0) / results.length
        : 0;

    processToast.finish({
      successCount,
      failCount,
      extraInfo: avgSavingsPercent > 0 ? `${avgSavingsPercent.toFixed(1)}% saved` : undefined,
    });

    if (successCount > 0 && onOperationComplete) {
      const dir = resolveOutputDir({
        results: results.filter((r) => r.success),
        fallbackDir: outputDir,
        fallbackPath: images[0]?.path,
      });

      onOperationComplete({
        type: 'compress',
        fileCount: successCount,
        outputDir: dir,
        details:
          compressionLevel === 'lossless'
            ? 'Lossless compression'
            : `Quality ${useCustom ? customQuality : compressionPresets[compressionLevel].quality}%`,
        totalSaved: totalSavedBytes > 0 ? totalSavedBytes : undefined,
        savingsPercent: avgSavingsPercent > 0 ? avgSavingsPercent : undefined,
      });
    }
  } catch (error) {
    console.error('Compression failed:', error);
    processToast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    onFinish([]);
  }
};
