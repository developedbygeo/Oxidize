import type { WatermarkPosition } from '@/types/image';

export type HAlign = 'left' | 'center' | 'right';
export type VAlign = 'top' | 'middle' | 'bottom';

/**
 * Split a 9-cell position into its horizontal + vertical anchors. Shared by
 * the position grid, the image preview, and the schema layer so they all
 * agree on what each cell means.
 */
export const positionToAnchors = (
  position: WatermarkPosition
): { h: HAlign; v: VAlign } => {
  const [v, h] = position.split('-') as [VAlign, HAlign];
  return { h, v };
};
