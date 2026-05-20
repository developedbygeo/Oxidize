import type { LucideIcon } from 'lucide-react';
import { ArrowRightLeft, Minimize2, Sparkles, Wand2, Workflow } from 'lucide-react';
import type { OperationType } from '@/types/image';

export const operationIcons: Record<OperationType, LucideIcon> = {
  convert: ArrowRightLeft,
  compress: Minimize2,
  beautify: Sparkles,
  effects: Wand2,
  pipeline: Workflow,
};

export const operationLabels: Record<OperationType, string> = {
  convert: 'Convert',
  compress: 'Compress',
  beautify: 'Beautify',
  effects: 'Effects',
  pipeline: 'Pipeline',
};
