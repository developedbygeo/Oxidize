import { useReducer } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRightLeft, Check, Loader2, FolderOpen, Sparkles, ExternalLink, X } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { toast } from 'sonner';
import { cn, resolveOutputDir } from '@/lib/utils';
import { createProcessToast } from '@/lib/process-toast';
import { fadeIn, fadeUp, expandHeight } from '@/lib/animations';
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
      <div className="max-w-3xl mx-auto p-6 space-y-5">
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          className="flex items-center gap-3"
        >
          <div className="p-2 rounded-lg bg-primary/10">
            <ArrowRightLeft className="w-4 h-4 text-primary" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Convert</h1>
            <p className="text-xs text-muted-foreground">
              Transform images to different formats
            </p>
          </div>
        </motion.div>

        <ImageDropzone
          images={images}
          onImagesChange={(imgs) => dispatch({ type: 'SET_IMAGES', payload: imgs })}
        />

        <AnimatePresence>
          {images.length > 0 && (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-5"
            >
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Output Format</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {outputFormats.map((format) => (
                    <button
                      key={format}
                      onClick={() => dispatch({ type: 'SET_TARGET_FORMAT', payload: format })}
                      className={cn(
                        'relative px-3 py-2 rounded-md text-xs font-medium transition-colors',
                        targetFormat === format
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {formatLabels[format]}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">{formatDescriptions[targetFormat]}</p>
              </div>

              {(targetFormat === 'jpg' || targetFormat === 'jpeg' || targetFormat === 'webp') && (
                <motion.div
                  variants={expandHeight}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quality</label>
                    <span className="text-xs font-mono text-primary">{quality}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={quality}
                    onChange={(e) => dispatch({ type: 'SET_QUALITY', payload: Number(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Smaller file</span>
                    <span>Better quality</span>
                  </div>
                </motion.div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Output Location</label>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    onClick={handleSelectOutputDir}
                    className="flex-1 justify-start gap-2 h-9 text-xs min-w-0"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate text-left flex-1">
                      {outputDir || 'Saved next to original files'}
                    </span>
                  </Button>
                  {outputDir && (
                    <Button
                      variant="outline"
                      onClick={() => dispatch({ type: 'SET_OUTPUT_DIR', payload: null })}
                      className="h-9 w-9 shrink-0"
                      aria-label="Clear output folder"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              <Button
                onClick={handleConvert}
                disabled={isConverting || images.length === 0}
                className="w-full h-10 gap-2"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Convert to {formatLabels[targetFormat]}
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showResults && results.length > 0 && (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-3"
            >
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Complete</p>
                    <p className="text-xs text-muted-foreground">
                      {successCount}/{results.length} converted
                      {totalSaved > 0 && ` · ${formatFileSize(Math.abs(totalSaved))} saved`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1 max-h-40 overflow-y-auto">
                {results.map((result, index) => (
                  <button
                    key={index}
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
                      'w-full flex items-center justify-between p-2 rounded-md text-xs transition-colors',
                      result.success
                        ? 'bg-muted/30 hover:bg-muted/50 cursor-pointer'
                        : 'bg-destructive/5 cursor-default'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={cn(
                          'w-1.5 h-1.5 rounded-full shrink-0',
                          result.success ? 'bg-primary' : 'bg-destructive'
                        )}
                      />
                      <span className="truncate">
                        {result.output_path?.split(/[/\\]/).pop() || `Image ${index + 1}`}
                      </span>
                    </div>
                    {result.success && (
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatFileSize(result.original_size)} → {formatFileSize(result.new_size)}
                        </span>
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}
                  </button>
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
