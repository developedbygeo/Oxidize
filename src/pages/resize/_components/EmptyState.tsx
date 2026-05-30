import { Scaling, Crop, Maximize2, Move } from 'lucide-react';
import { ImageDropzone } from '@/components/ImageDropzone';
import { PageHeader } from '@/components/page-parts/PageHeader';
import type { ImageInfo } from '@/types/image';

type EmptyStateProps = {
  onImagesChange: (images: ImageInfo[]) => void;
};

const TEASERS = [
  { icon: Crop, label: 'Cover', hint: 'Fill the target, crop overflow' },
  { icon: Maximize2, label: 'Contain', hint: 'Fit inside, keep aspect' },
  { icon: Move, label: 'Stretch', hint: 'Exact target, ignore aspect' },
];

const EmptyState = ({ onImagesChange }: EmptyStateProps) => (
  <div className="h-full overflow-auto">
    <div className="max-w-3xl mx-auto p-6 space-y-5">
      <PageHeader
        icon={Scaling}
        title="Resize"
        description="Scale images to a target width, height, or both"
      />

      <ImageDropzone images={[]} onImagesChange={onImagesChange} />

      <div className="space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
          Fit modes for two-dimension targets
        </p>
        <div className="grid grid-cols-3 gap-1.5">
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
