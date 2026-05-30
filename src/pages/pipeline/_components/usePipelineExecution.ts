import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { resolveOutputDir } from '@/lib/utils';
import { createProcessToast } from '@/lib/process-toast';
import { isCancelledError } from '@/lib/ffmpeg-errors';
import type {
  ImageInfo,
  OperationHistoryItem,
  PipelineResult,
} from '@/types/image';
import { buildDetails, buildOptions, hasPipelineWork } from './pipeline-build';
import type { PipelineFormValues } from './schema';

type UsePipelineExecutionArgs = {
  images: ImageInfo[];
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

export const usePipelineExecution = ({ images, onOperationComplete }: UsePipelineExecutionArgs) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const execute = async (values: PipelineFormValues) => {
    if (images.length === 0 || !hasPipelineWork(values)) return;

    setIsProcessing(true);
    const processToast = createProcessToast({
      progressLabel: 'Running pipeline on',
      doneLabel: 'Pipeline',
      itemCount: images.length,
    });

    try {
      const results = await invoke<PipelineResult[]>('process_pipeline_batch', {
        inputPaths: images.map((img) => img.path),
        options: buildOptions(values),
      });

      const successful = results.filter((r) => r.success);
      const cancelledCount = results.filter((r) => isCancelledError(r.error)).length;
      const failCount = results.length - successful.length - cancelledCount;
      const totalSaved = results.reduce(
        (acc, r) => acc + Math.max(0, r.original_size - r.new_size),
        0
      );

      if (cancelledCount > 0) {
        processToast.cancelled(successful.length);
      } else {
        processToast.finish({
          successCount: successful.length,
          failCount,
        });
      }

      if (successful.length > 0 && onOperationComplete) {
        const dir = resolveOutputDir({
          results: successful.map((r) => ({ output_path: r.output_path })),
          fallbackDir: values.outputDir,
          fallbackPath: images[0]?.path,
        });

        onOperationComplete({
          type: 'pipeline',
          fileCount: images.length,
          outputDir: dir,
          details: `Pipeline: ${buildDetails(values).join(' → ')}`,
          totalSaved: totalSaved > 0 ? totalSaved : undefined,
        });
      }
    } catch (error) {
      console.error('Pipeline failed:', error);
      processToast.error(error instanceof Error ? error.message : 'Pipeline execution failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return { isProcessing, execute };
};
