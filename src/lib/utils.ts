import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getDirectory = (filePath: string): string => {
  const lastSep = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  return lastSep > 0 ? filePath.slice(0, lastSep) : filePath;
};

type OutputDirParams<T extends { output_path?: string | null }> = {
  results: T[];
  fallbackDir: string | null;
  fallbackPath?: string;
};

export const resolveOutputDir = <T extends { output_path?: string | null }>({
  results,
  fallbackDir,
  fallbackPath,
}: OutputDirParams<T>): string => {
  const firstSuccessPath = results.find((r) => r.output_path)?.output_path;

  if (firstSuccessPath) return getDirectory(firstSuccessPath);
  if (fallbackDir) return fallbackDir;
  if (fallbackPath) return getDirectory(fallbackPath);
  return '';
};

type AdjustmentEntry = {
  label: string;
  value: number | string;
  defaultValue?: number | string;
  showSign?: boolean;
  suffix?: string;
};

export const formatAdjustmentDetails = (
  adjustments: AdjustmentEntry[],
  maxItems = 3,
  fallback = 'No adjustments'
): string => {
  const changes = adjustments
    .filter(({ value, defaultValue = 0 }) => value !== defaultValue)
    .map(({ label, value, showSign = true, suffix = '' }) => {
      if (typeof value === 'string') return `${label}: ${value}`;
      const sign = showSign && value > 0 ? '+' : '';
      return `${label} ${sign}${value}${suffix}`;
    });

  return changes.length > 0 ? changes.slice(0, maxItems).join(', ') : fallback;
};
