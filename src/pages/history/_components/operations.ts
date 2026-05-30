import type { LucideIcon } from 'lucide-react';
import {
  ArrowRightLeft,
  Minimize2,
  Sparkles,
  Wand2,
  Workflow,
  FileVideo,
  Film,
  Crop,
  Maximize2,
  Music,
  RotateCw,
  Scissors,
  Scaling,
} from 'lucide-react';
import type { OperationType } from '@/types/image';

export const operationIcons: Record<OperationType, LucideIcon> = {
  convert: ArrowRightLeft,
  compress: Minimize2,
  beautify: Sparkles,
  effects: Wand2,
  crop: Crop,
  rotate: RotateCw,
  resize: Scaling,
  pipeline: Workflow,
  'video-convert': FileVideo,
  'video-compress': Film,
  'video-resize': Maximize2,
  'video-trim': Scissors,
  'extract-audio': Music,
};

export const operationLabels: Record<OperationType, string> = {
  convert: 'Convert',
  compress: 'Compress',
  beautify: 'Beautify',
  effects: 'Effects',
  crop: 'Crop',
  rotate: 'Rotate',
  resize: 'Resize',
  pipeline: 'Pipeline',
  'video-convert': 'Video Convert',
  'video-compress': 'Video Compress',
  'video-resize': 'Video Resize',
  'video-trim': 'Video Trim',
  'extract-audio': 'Extract Audio',
};
