import type { ComponentType } from 'react';
import { ConvertPage } from '@/pages/convert';
import { CompressPage } from '@/pages/compress';
import { BeautifyPage } from '@/pages/beautify';
import { EffectsPage } from '@/pages/effects';
import { CropPage } from '@/pages/crop';
import { RotatePage } from '@/pages/rotate';
import { ResizePage } from '@/pages/resize';
import { WatermarkPage } from '@/pages/watermark';
import { SocialPage } from '@/pages/social';
import { PipelinePage } from '@/pages/pipeline';
import { VideoConvertPage } from '@/pages/video-convert';
import { VideoCompressPage } from '@/pages/video-compress';
import { VideoResizePage } from '@/pages/video-resize';
import { VideoWatermarkPage } from '@/pages/video-watermark';
import { VideoTrimPage } from '@/pages/video-trim';
import { ExtractAudioPage } from '@/pages/extract-audio';
import type { OperationHistoryItem } from '@/types/image';

export type Page =
  | 'convert'
  | 'compress'
  | 'beautify'
  | 'effects'
  | 'crop'
  | 'rotate'
  | 'resize'
  | 'watermark'
  | 'social'
  | 'pipeline'
  | 'video-convert'
  | 'video-compress'
  | 'video-resize'
  | 'video-watermark'
  | 'video-trim'
  | 'extract-audio'
  | 'history';

export type OperationPageId = Exclude<Page, 'history'>;

export type OperationPageProps = {
  onOperationComplete: (
    item: Omit<OperationHistoryItem, 'id' | 'timestamp'>
  ) => void | Promise<void>;
};

type PageMeta = {
  /** Long-form heading shown in the app header. */
  title: string;
  /** Header subtitle. */
  subtitle: string;
  /** Short label used in the sidebar and shortcut cheat sheet. */
  navLabel: string;
};

export const pageMeta: Record<Page, PageMeta> = {
  convert: {
    title: 'Convert Images',
    subtitle: 'Drag and drop files to get started',
    navLabel: 'Convert',
  },
  compress: {
    title: 'Compress Images',
    subtitle: 'Drag and drop files to get started',
    navLabel: 'Compress',
  },
  beautify: {
    title: 'Beautify Images',
    subtitle: 'Drag and drop files to get started',
    navLabel: 'Beautify',
  },
  effects: {
    title: 'Apply Effects',
    subtitle: 'Drag and drop files to get started',
    navLabel: 'Effects',
  },
  crop: {
    title: 'Crop Image',
    subtitle: 'Trim an image to a specific region or aspect ratio',
    navLabel: 'Crop',
  },
  rotate: {
    title: 'Rotate Images',
    subtitle: 'Quarter-turn rotation and flips, applied across a batch',
    navLabel: 'Rotate',
  },
  resize: {
    title: 'Resize Images',
    subtitle: 'Scale to a target width, height, or both',
    navLabel: 'Resize',
  },
  watermark: {
    title: 'Watermark Images',
    subtitle: 'Overlay a logo or mark across a batch',
    navLabel: 'Watermark',
  },
  social: {
    title: 'Social presets',
    subtitle: 'One-click correct dimensions for the platforms you actually post to',
    navLabel: 'Social',
  },
  pipeline: {
    title: 'Pipeline',
    subtitle: 'Chain multiple operations together',
    navLabel: 'Pipeline',
  },
  'video-convert': {
    title: 'Convert Videos',
    subtitle: 'Change video format and container',
    navLabel: 'Video Convert',
  },
  'video-compress': {
    title: 'Compress Videos',
    subtitle: 'Shrink video files',
    navLabel: 'Video Compress',
  },
  'video-resize': {
    title: 'Resize Videos',
    subtitle: 'Scale to a target resolution',
    navLabel: 'Video Resize',
  },
  'video-watermark': {
    title: 'Watermark Videos',
    subtitle: 'Overlay a logo or mark onto a batch of videos',
    navLabel: 'Video Watermark',
  },
  'video-trim': {
    title: 'Trim Videos',
    subtitle: 'Cut a portion out of a video',
    navLabel: 'Video Trim',
  },
  'extract-audio': {
    title: 'Extract Audio',
    subtitle: 'Pull the audio track out of a video',
    navLabel: 'Extract Audio',
  },
  history: {
    title: 'Operation History',
    subtitle: 'View and manage your recent operations',
    navLabel: 'History',
  },
};

/** Pages reachable via Ctrl+1..9. Order is meaningful — the index drives the digit. */
export const navOrder: Page[] = [
  'convert',
  'compress',
  'beautify',
  'effects',
  'crop',
  'rotate',
  'resize',
  'social',
  'pipeline',
];

export const operationPages: Record<OperationPageId, ComponentType<OperationPageProps>> = {
  convert: ConvertPage,
  compress: CompressPage,
  beautify: BeautifyPage,
  effects: EffectsPage,
  crop: CropPage,
  rotate: RotatePage,
  resize: ResizePage,
  watermark: WatermarkPage,
  social: SocialPage,
  pipeline: PipelinePage,
  'video-convert': VideoConvertPage,
  'video-compress': VideoCompressPage,
  'video-resize': VideoResizePage,
  'video-watermark': VideoWatermarkPage,
  'video-trim': VideoTrimPage,
  'extract-audio': ExtractAudioPage,
};
