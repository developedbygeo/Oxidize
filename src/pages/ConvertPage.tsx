import { useReducer } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRightLeft, Check, Loader2, FolderOpen, Sparkles, ExternalLink } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { toast } from 'sonner';
import { cn, resolveOutputDir } from '@/lib/utils';
import { createProcessToast } from '@/lib/process-toast';
import { Button } from '@/components/ui/button';
import { ImageDropzone } from '@/components/ImageDropzone';
import type { ImageInfo, ConversionResult, ImageFormat, OperationHistoryItem } from '@/types/image';
import { formatLabels, formatDescriptions } from '@/types/image';

type ConvertPageProps = {
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
};

const outputFormats: ImageFormat[] = ['png', 'jpg', 'webp', 'gif', 'bmp', 'tiff'];

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

type ConvertState = {
  images: ImageInfo[];
  targetFormat: ImageFormat;
  quality: number;
  outputDir: string | null;
  isConverting: boolean;
  results: ConversionResult[];
  showResults: boolean;
};

type ConvertAction =
  | { type: 'SET_IMAGES'; payload: ImageInfo[] }
  | { type: 'SET_TARGET_FORMAT'; payload: ImageFormat }
  | { type: 'SET_QUALITY'; payload: number }
  | { type: 'SET_OUTPUT_DIR'; payload: string | null }
  | { type: 'START_CONVERTING' }
  | { type: 'FINISH_CONVERTING'; payload: ConversionResult[] };

const initialState: ConvertState = {
  images: [],
  targetFormat: 'webp',
  quality: 85,
  outputDir: null,
  isConverting: false,
  results: [],
  showResults: false,
};

const convertReducer = (state: ConvertState, action: ConvertAction): ConvertState => {
  switch (action.type) {
    case 'SET_IMAGES':
      return { ...state, images: action.payload };
    case 'SET_TARGET_FORMAT':
      return { ...state, targetFormat: action.payload };
    case 'SET_QUALITY':
      return { ...state, quality: action.payload };
    case 'SET_OUTPUT_DIR':
      return { ...state, outputDir: action.payload };
    case 'START_CONVERTING':
      return { ...state, isConverting: true, showResults: false };
    case 'FINISH_CONVERTING':
      return { ...state, isConverting: false, results: action.payload, showResults: true };
    default:
      return state;
  }
};

const ConvertPage = ({ onOperationComplete }: ConvertPageProps) => {
  const [state, dispatch] = useReducer(convertReducer, initialState);
  const { images, targetFormat, quality, outputDir, isConverting, results, showResults } = state;

  const handleSelectOutputDir = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
    });
    if (selected) {
      dispatch({ type: 'SET_OUTPUT_DIR', payload: selected as string });
    }
  };

  const handleConvert = async () => {
    if (images.length === 0) return;

    dispatch({ type: 'START_CONVERTING' });
    const processToast = createProcessToast({ action: 'Conversion', itemCount: images.length });

    try {
      const paths = images.map((img) => img.path);
      const conversionResults = await invoke<ConversionResult[]>('convert_images_batch', {
        inputPaths: paths,
        options: {
          format: targetFormat,
          quality,
          output_dir: outputDir,
        },
      });

      dispatch({ type: 'FINISH_CONVERTING', payload: conversionResults });

      const successCount = conversionResults.filter((r) => r.success).length;
      const failCount = conversionResults.length - successCount;
      const totalSaved = conversionResults.reduce((acc, r) => acc + (r.original_size - r.new_size), 0);

      processToast.finish({
        successCount,
        failCount,
        extraInfo: `converted to ${formatLabels[targetFormat]}`,
      });

      if (successCount > 0 && onOperationComplete) {
        const dir = resolveOutputDir({
          results: conversionResults.filter((r) => r.success),
          fallbackDir: outputDir,
          fallbackPath: images[0]?.path,
        });

        onOperationComplete({
          type: 'convert',
          fileCount: successCount,
          outputDir: dir,
          details: `Converted to ${formatLabels[targetFormat]}`,
          totalSaved: totalSaved > 0 ? totalSaved : undefined,
        });
      }
    } catch (error) {
      console.error('Conversion failed:', error);
      processToast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
      dispatch({ type: 'FINISH_CONVERTING', payload: [] });
    }
  };

  const successCount = results.filter((r) => r.success).length;
  const totalSaved = results.reduce((acc, r) => acc + (r.original_size - r.new_size), 0);

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <div className="p-3 rounded-2xl bg-primary/10">
            <ArrowRightLeft className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Convert Images</h1>
            <p className="text-sm text-muted-foreground">
              Transform your images to different formats
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
                  Output Format
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {outputFormats.map((format) => (
                    <motion.button
                      key={format}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => dispatch({ type: 'SET_TARGET_FORMAT', payload: format })}
                      className={cn(
                        'relative p-3 rounded-xl border-2 transition-all duration-200',
                        targetFormat === format
                          ? 'border-primary bg-primary/10'
                          : 'border-border/50 hover:border-primary/50 hover:bg-muted/50'
                      )}
                    >
                      {targetFormat === format && (
                        <motion.div
                          layoutId="formatIndicator"
                          className="absolute inset-0 rounded-xl bg-primary/5"
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      )}
                      <span
                        className={cn(
                          'relative text-sm font-semibold',
                          targetFormat === format ? 'text-primary' : 'text-foreground'
                        )}
                      >
                        {formatLabels[format]}
                      </span>
                    </motion.button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDescriptions[targetFormat]}
                </p>
              </div>

              {(targetFormat === 'jpg' || targetFormat === 'jpeg' || targetFormat === 'webp') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">
                      Quality
                    </label>
                    <span className="text-sm font-mono text-primary">{quality}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={quality}
                    onChange={(e) => dispatch({ type: 'SET_QUALITY', payload: Number(e.target.value) })}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Smaller file</span>
                    <span>Better quality</span>
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
                onClick={handleConvert}
                disabled={isConverting || images.length === 0}
                size="lg"
                className="w-full h-14 text-lg gap-3"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Converting {images.length} images...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Convert {images.length} image{images.length !== 1 ? 's' : ''} to{' '}
                    {formatLabels[targetFormat]}
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
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/20">
                    <Check className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      Conversion Complete
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {successCount} of {results.length} images converted successfully
                      {totalSaved > 0 && (
                        <span className="text-primary ml-1">
                          • Saved {formatFileSize(Math.abs(totalSaved))}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 max-h-[200px] overflow-y-auto">
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
                          result.success ? 'bg-primary' : 'bg-destructive'
                        )}
                      />
                      <span className="text-sm truncate">
                        {result.output_path?.split(/[/\\]/).pop() || `Image ${index + 1}`}
                      </span>
                    </div>
                    {result.success && (
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatFileSize(result.original_size)} → {formatFileSize(result.new_size)}
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

ConvertPage.displayName = 'ConvertPage';

export { ConvertPage };
