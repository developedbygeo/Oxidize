import { formatFileSize } from '@/pages/history/_components/formatters';

/**
 * Soft thresholds above which we surface a warning. Not hard caps — the user
 * can still process huge files, they're just told the operation may be slow
 * or could exhaust memory.
 */
export const FILE_SIZE_WARNING_BYTES = {
  image: 100 * 1024 * 1024, // 100 MB — image decoders read whole file into memory
  video: 2 * 1024 * 1024 * 1024, // 2 GB — ffmpeg streams, but output can be huge
} as const;

export type FileKind = keyof typeof FILE_SIZE_WARNING_BYTES;

const KIND_LABELS: Record<FileKind, { singular: string; plural: string }> = {
  image: { singular: 'image', plural: 'images' },
  video: { singular: 'video', plural: 'videos' },
};

type FileLike = { name: string; size: number };

export type SizeWarning = {
  title: string;
  description: string;
};

const MAX_NAMED_FILES = 3;

/**
 * Returns a toast-ready warning if any file exceeds the soft threshold for
 * its kind, or null otherwise. Naming up to {@link MAX_NAMED_FILES} offenders
 * inline; the rest are summarised as a count.
 */
export const fileSizeWarning = (files: FileLike[], kind: FileKind): SizeWarning | null => {
  const threshold = FILE_SIZE_WARNING_BYTES[kind];
  const oversize = files.filter((f) => f.size > threshold);
  if (oversize.length === 0) return null;

  const labels = KIND_LABELS[kind];
  const title =
    oversize.length === 1
      ? `Large ${labels.singular} loaded`
      : `${oversize.length} large ${labels.plural} loaded`;

  const named = oversize
    .slice(0, MAX_NAMED_FILES)
    .map((f) => `${f.name} (${formatFileSize(f.size)})`)
    .join(', ');
  const remainder =
    oversize.length > MAX_NAMED_FILES ? ` and ${oversize.length - MAX_NAMED_FILES} more` : '';
  const tail = ' — processing may be slow or run out of memory.';

  return { title, description: `${named}${remainder}${tail}` };
};
