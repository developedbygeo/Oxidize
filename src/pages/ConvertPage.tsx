import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRightLeft, Check, Loader2, FolderOpen, Sparkles } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ImageDropzone } from '@/components/ImageDropzone';
import type { ImageInfo, ConversionResult, ImageFormat, OperationHistoryItem } from '@/types/image';
import { formatLabels, formatDescriptions } from '@/types/image';

interface ConvertPageProps {
  onOperationComplete?: (item: Omit<OperationHistoryItem, 'id' | 'timestamp'>) => void;
}

const outputFormats: ImageFormat[] = ['png', 'jpg', 'webp', 'gif', 'bmp', 'tiff'];

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const ConvertPage = ({ onOperationComplete }: ConvertPageProps) => {
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [targetFormat, setTargetFormat] = useState<ImageFormat>('webp');
  const [quality, setQuality] = useState(85);
  const [outputDir, setOutputDir] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [results, setResults] = useState<ConversionResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSelectOutputDir = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
    });
    if (selected) {
      setOutputDir(selected as string);
    }
  };

  const handleConvert = async () => {
    if (images.length === 0) return;

    setIsConverting(true);
    setShowResults(false);

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

      setResults(conversionResults);
      setShowResults(true);

      // Add to history
      const successCount = conversionResults.filter((r) => r.success).length;
      if (successCount > 0 && onOperationComplete) {
        const firstSuccess = conversionResults.find((r) => r.success && r.output_path);
        // Get directory from output path, preserving original separators
        const getDir = (filePath: string) => {
          const lastSep = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
          return lastSep > 0 ? filePath.slice(0, lastSep) : filePath;
        };
        const dir = (firstSuccess?.output_path && getDir(firstSuccess.output_path)) ||
          outputDir ||
          (images[0]?.path && getDir(images[0].path)) ||
          '';
        const totalSaved = conversionResults.reduce((acc, r) => acc + (r.original_size - r.new_size), 0);

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
    } finally {
      setIsConverting(false);
    }
  };

  const successCount = results.filter((r) => r.success).length;
  const totalSaved = results.reduce((acc, r) => acc + (r.original_size - r.new_size), 0);

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
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

        {/* Dropzone */}
        <ImageDropzone images={images} onImagesChange={setImages} />

        {/* Options */}
        <AnimatePresence>
          {images.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Format Selection */}
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
                      onClick={() => setTargetFormat(format)}
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

              {/* Quality Slider (for lossy formats) */}
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
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Smaller file</span>
                    <span>Better quality</span>
                  </div>
                </motion.div>
              )}

              {/* Output Directory */}
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

              {/* Convert Button */}
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

        {/* Results */}
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

              {/* Individual Results */}
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {results.map((result, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-xl',
                      result.success ? 'bg-muted/50' : 'bg-destructive/10'
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
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {formatFileSize(result.original_size)} → {formatFileSize(result.new_size)}
                      </span>
                    )}
                  </motion.div>
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
