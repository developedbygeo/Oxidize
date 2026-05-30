import { RotateCw, RotateCcw, FlipHorizontal2, FlipVertical2 } from 'lucide-react';
import { ImageDropzone } from '@/components/ImageDropzone';
import { PageHeader } from '@/components/page-parts/PageHeader';
import type { ImageInfo } from '@/types/image';

type EmptyStateProps = {
  onImagesChange: (images: ImageInfo[]) => void;
};

const TEASERS = [
  { icon: RotateCw, label: 'Rotate 90°', hint: 'Clockwise quarter turn' },
  { icon: RotateCcw, label: 'Rotate 270°', hint: 'Counter-clockwise turn' },
  { icon: FlipHorizontal2, label: 'Flip horizontal', hint: 'Mirror left ↔ right' },
  { icon: FlipVertical2, label: 'Flip vertical', hint: 'Mirror top ↔ bottom' },
];

const EmptyState = ({ onImagesChange }: EmptyStateProps) => (
  <div className="h-full overflow-auto">
    <div className="max-w-3xl mx-auto p-6 space-y-5">
      <PageHeader
        icon={RotateCw}
        title="Rotate"
        description="Orient images with quarter-turn rotation and flips"
      />

      <ImageDropzone images={[]} onImagesChange={onImagesChange} />

      <div className="space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
          What you can do
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {TEASERS.map(({ icon: Icon, label, hint }) => (
            <div
              key={label}
              className="p-2.5 rounded-md bg-muted/30 border border-border/30 text-center space-y-1"
            >
              <Icon className="w-4 h-4 mx-auto text-muted-foreground" strokeWidth={1.75} />
              <span className="block text-[10px] font-semibold text-foreground">{label}</span>
              <span className="block text-[9px] text-muted-foreground leading-tight">{hint}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

EmptyState.displayName = 'EmptyState';

export { EmptyState };
