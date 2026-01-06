import { useReducer } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Minimize2, Check, Loader2, FolderOpen, Zap, TrendingDown, ExternalLink } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { toast } from 'sonner';
import { cn, resolveOutputDir } from '@/lib/utils';
import { createProcessToast } from '@/lib/process-toast';
import { Button } from '@/components/ui/button';
import { ImageDropzone } from '@/components/ImageDropzone';
import type { ImageInfo, CompressionResult, OperationHistoryItem } from '@/types/image';

type CompressPageProps = {
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

type CompressionLevel = 'lossless' | 'balanced' | 'maximum';

const compressionPresets: Record<CompressionLevel, { quality: number; label: string; description: string }> = {
  lossless: { quality: 100, label: 'Lossless', description: 'No quality loss, smaller savings' },
  balanced: { quality: 80, label: 'Balanced', description: 'Great quality, good compression' },
  maximum: { quality: 60, label: 'Maximum', description: 'Smaller files, some quality loss' },
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

type CompressState = {
  images: ImageInfo[];
  compressionLevel: CompressionLevel;
  customQuality: number;
  useCustom: boolean;
  outputDir: string | null;
  isCompressing: boolean;
  results: CompressionResult[];
  showResults: boolean;
};

type CompressAction =
  | { type: 'SET_IMAGES'; payload: ImageInfo[] }
  | { type: 'SET_COMPRESSION_LEVEL'; payload: CompressionLevel }
  | { type: 'SET_CUSTOM_QUALITY'; payload: number }
  | { type: 'SET_USE_CUSTOM'; payload: boolean }
  | { type: 'SET_OUTPUT_DIR'; payload: string | null }
  | { type: 'START_COMPRESSING' }
  | { type: 'FINISH_COMPRESSING'; payload: CompressionResult[] }
  | { type: 'RESET_RESULTS' };

const initialState: CompressState = {
  images: [],
  compressionLevel: 'balanced',
  customQuality: 80,
  useCustom: false,
  outputDir: null,
  isCompressing: false,
  results: [],
  showResults: false,
};

const compressReducer = (state: CompressState, action: CompressAction): CompressState => {
  switch (action.type) {
    case 'SET_IMAGES':
      return { ...state, images: action.payload };
    case 'SET_COMPRESSION_LEVEL':
      return { ...state, compressionLevel: action.payload, useCustom: false };
    case 'SET_CUSTOM_QUALITY':
      return { ...state, customQuality: action.payload, useCustom: true };
    case 'SET_USE_CUSTOM':
      return { ...state, useCustom: action.payload };
    case 'SET_OUTPUT_DIR':
      return { ...state, outputDir: action.payload };
    case 'START_COMPRESSING':
      return { ...state, isCompressing: true, showResults: false };
    case 'FINISH_COMPRESSING':
      return { ...state, isCompressing: false, results: action.payload, showResults: true };
    case 'RESET_RESULTS':
      return { ...state, results: [], showResults: false };
    default:
      return state;
  }
};

const CompressPage = ({ onOperationComplete }: CompressPageProps) => {
  const [state, dispatch] = useReducer(compressReducer, initialState);
  const { images, compressionLevel, customQuality, useCustom, outputDir, isCompressing, results, showResults } = state;

  const handleSelectOutputDir = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
    });
    if (selected) {
      dispatch({ type: 'SET_OUTPUT_DIR', payload: selected as string });
    }
  };

  const handleCompress = async () => {
    if (images.length === 0) return;

    dispatch({ type: 'START_COMPRESSING' });
    const processToast = createProcessToast({ action: 'Compression', itemCount: images.length });

    try {
      const paths = images.map((img) => img.path);
      const quality = compressionLevel === 'lossless'
        ? 100
        : (useCustom ? customQuality : compressionPresets[compressionLevel].quality);

      const compressionResults = await invoke<CompressionResult[]>('compress_images_batch', {
        inputPaths: paths,
        options: {
          quality,
          output_dir: outputDir,
        },
      });

      dispatch({ type: 'FINISH_COMPRESSING', payload: compressionResults });

      const successCount = compressionResults.filter((r) => r.success).length;
      const failCount = compressionResults.length - successCount;
      const totalSavedBytes = compressionResults.reduce((acc, r) => acc + (r.original_size - r.new_size), 0);
      const avgSavingsPercent = compressionResults.length > 0
        ? compressionResults.reduce((acc, r) => acc + r.savings_percent, 0) / compressionResults.length
        : 0;

      processToast.finish({
        successCount,
        failCount,
        extraInfo: avgSavingsPercent > 0 ? `${avgSavingsPercent.toFixed(1)}% saved` : undefined,
      });

      if (successCount > 0 && onOperationComplete) {
        const dir = resolveOutputDir({
          results: compressionResults.filter((r) => r.success),
          fallbackDir: outputDir,
          fallbackPath: images[0]?.path,
        });

        onOperationComplete({
          type: 'compress',
          fileCount: successCount,
          outputDir: dir,
          details: compressionLevel === 'lossless' ? 'Lossless compression' : `Quality ${useCustom ? customQuality : compressionPresets[compressionLevel].quality}%`,
          totalSaved: totalSavedBytes > 0 ? totalSavedBytes : undefined,
          savingsPercent: avgSavingsPercent > 0 ? avgSavingsPercent : undefined,
        });
      }
    } catch (error) {
      console.error('Compression failed:', error);
      processToast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
      dispatch({ type: 'FINISH_COMPRESSING', payload: [] });
    }
  };

  const successCount = results.filter((r) => r.success).length;
  const totalOriginal = results.reduce((acc, r) => acc + r.original_size, 0);
  const totalNew = results.reduce((acc, r) => acc + r.new_size, 0);
  const totalSaved = totalOriginal - totalNew;
  const avgSavings = results.length > 0
    ? results.reduce((acc, r) => acc + r.savings_percent, 0) / results.length
    : 0;

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <div className="p-3 rounded-2xl bg-emerald-500/10">
            <Minimize2 className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Compress Images</h1>
            <p className="text-sm text-muted-foreground">
              Reduce file sizes while preserving quality
            </p>
          </div>
        </motion.div>

        <ImageDropzone images={images} onImagesChange={(imgs) => dispatch({ type: 'SET_IMAGES', payload: imgs })} />

        <AnimatePresence>
          {images.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  Compression Level
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(Object.entries(compressionPresets) as [CompressionLevel, typeof compressionPresets.lossless][]).map(([level, preset]) => (
                    <motion.button
                      key={level}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => dispatch({ type: 'SET_COMPRESSION_LEVEL', payload: level })}
                      className={cn(
                        'relative p-4 rounded-xl border-2 transition-all duration-200 text-left',
                        !useCustom && compressionLevel === level
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-border/50 hover:border-emerald-500/50 hover:bg-muted/50'
                      )}
                    >
                      <span
                        className={cn(
                          'block text-sm font-semibold',
                          !useCustom && compressionLevel === level ? 'text-emerald-500' : 'text-foreground'
                        )}
                      >
                        {preset.label}
                      </span>
                      <span className="block text-xs text-muted-foreground mt-1">
                        {preset.description}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {compressionLevel !== 'lossless' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">
                      Custom Quality
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dispatch({ type: 'SET_USE_CUSTOM', payload: !useCustom })}
                      className={cn(
                        'text-xs',
                        useCustom ? 'text-emerald-500' : 'text-muted-foreground'
                      )}
                    >
                      {useCustom ? 'Using custom' : 'Use custom'}
                    </Button>
                  </div>
                  <div className={cn('transition-opacity', useCustom ? 'opacity-100' : 'opacity-50')}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">Quality</span>
                      <span className="text-sm font-mono text-emerald-500">{customQuality}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={customQuality}
                      onChange={(e) => dispatch({ type: 'SET_CUSTOM_QUALITY', payload: Number(e.target.value) })}
                      className="w-full accent-emerald-500"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Smaller file</span>
                      <span>Better quality</span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  Output Location
                </label>
                <Button
                  variant="outline"
                  onClick={handleSelectOutputDir}
                  className="w-full justify-start gap-2 h-12"
                >
                  <FolderOpen className="w-4 h-4 text-muted-foreground" />
                  <span className="truncate text-left flex-1">
                    {outputDir || 'Same as original (click to change)'}
                  </span>
                </Button>
              </div>

              <Button
                onClick={handleCompress}
                disabled={isCompressing || images.length === 0}
                size="lg"
                className="w-full h-14 text-lg gap-3 bg-emerald-500 hover:bg-emerald-600"
              >
                {isCompressing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Compressing {images.length} images...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Compress {images.length} image{images.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showResults && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/20">
                    <Check className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      Compression Complete
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {successCount} of {results.length} images compressed
                    </p>
                  </div>
                  {totalSaved > 0 && (
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-emerald-500">
                        <TrendingDown className="w-4 h-4" />
                        <span className="font-semibold">{avgSavings.toFixed(1)}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Saved {formatFileSize(totalSaved)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 max-h-50 overflow-y-auto">
                {results.map((result, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={async () => {
                      if (result.success && result.output_path) {
                        try {
                          await invoke('reveal_file', { path: result.output_path });
                        } catch {
                          toast.error('File not found', {
                            description: 'The output file may have been moved or deleted.',
                          });
                        }
                      }
                    }}
                    disabled={!result.success || !result.output_path}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-xl transition-colors',
                      result.success
                        ? 'bg-muted/50 hover:bg-muted cursor-pointer'
                        : 'bg-destructive/10 cursor-default'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full',
                          result.success ? 'bg-emerald-500' : 'bg-destructive'
                        )}
                      />
                      <span className="text-sm truncate">
                        {result.output_path?.split(/[/\\]/).pop() || `Image ${index + 1}`}
                      </span>
                    </div>
                    {result.success && (
                      <div className="flex items-center gap-3 ml-2">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatFileSize(result.original_size)} → {formatFileSize(result.new_size)}
                        </span>
                        <span className={cn(
                          'text-xs font-medium whitespace-nowrap',
                          result.savings_percent > 0 ? 'text-emerald-500' : 'text-muted-foreground'
                        )}>
                          {result.savings_percent > 0 ? `-${result.savings_percent.toFixed(1)}%` : '0%'}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

CompressPage.displayName = 'CompressPage';

export { CompressPage };
