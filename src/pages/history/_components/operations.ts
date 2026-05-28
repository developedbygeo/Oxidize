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
  Music,
  Scissors,
} from 'lucide-react';
import type { OperationType } from '@/types/image';

export const operationIcons: Record<OperationType, LucideIcon> = {
  convert: ArrowRightLeft,
  compress: Minimize2,
  beautify: Sparkles,
  effects: Wand2,
  pipeline: Workflow,
  'video-convert': FileVideo,
  'video-compress': Film,
  'video-resize': Crop,
  'video-trim': Scissors,
  'extract-audio': Music,
};

export const operationLabels: Record<OperationType, string> = {
  convert: 'Convert',
  compress: 'Compress',
  beautify: 'Beautify',
  effects: 'Effects',
  pipeline: 'Pipeline',
  'video-convert': 'Video Convert',
  'video-compress': 'Video Compress',
  'video-resize': 'Video Resize',
  'video-trim': 'Video Trim',
  'extract-audio': 'Extract Audio',
};
