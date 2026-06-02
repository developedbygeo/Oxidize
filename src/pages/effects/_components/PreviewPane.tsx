import { Loader2 } from 'lucide-react';
import { EffectsPreview, type EffectPreviewOptions } from '@/components/EffectsPreview';
import type { ImageInfo } from '@/types/image';

type PreviewPaneProps = {
  image: ImageInfo | undefined;
  previewSrc: string;
  isLoading: boolean;
  options: EffectPreviewOptions;
};

const PreviewPane = ({ image, previewSrc, isLoading, options }: PreviewPaneProps) => (
  <div className="flex-1 min-h-0 relative">
    {isLoading && (
      <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    )}
    {image && previewSrc && (
      <EffectsPreview key={image.path} src={previewSrc} options={options} className="h-full w-full" />
    )}
  </div>
);

PreviewPane.displayName = 'PreviewPane';

export { PreviewPane };
