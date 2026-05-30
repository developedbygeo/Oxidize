/**
 * Reshape raw image-pipeline errors into a one-line user-friendly title plus
 * the original error string as expandable details. Mirrors
 * `humanizeFfmpegError` for the image side. Patterns are matched loosely
 * because the underlying error strings come from several crates
 * (image, oxipng, mozjpeg, webp, exoquant, png) with no shared format.
 */

import { isCancelledError, isSkippedError, type FriendlyError } from './ffmpeg-errors';

const PATTERNS: ReadonlyArray<{ match: RegExp; title: string }> = [
  // Soft sentinels — share the same titles as the ffmpeg side so the toast
  // copy stays consistent.
  { match: /^cancelled$/i, title: 'Cancelled' },
  { match: /^skipped$/i, title: 'Skipped — output already exists' },

  // File system
  { match: /no such file or directory|not found|cannot find|could not find/i, title: 'File not found' },
  { match: /permission denied|access is denied|access denied/i, title: 'Permission denied — check folder access' },
  { match: /no space left on device|disk full|insufficient.*space/i, title: 'Disk full' },
  { match: /read-only file system/i, title: 'Output folder is read-only' },

  // Memory / size — keep before generic decode/encode patterns so an
  // "allocation failed during encoding" surfaces as OOM, not as a generic
  // encode failure.
  { match: /out of memory|allocation.*failed|cannot allocate|memory exhausted|allocator/i, title: 'Out of memory — try a smaller image' },
  { match: /image too large|dimensions.*too.*large|width.*too.*large|height.*too.*large/i, title: 'Image is too large to process' },

  // Decode
  { match: /unsupported format|unsupported color type|unsupported.*depth/i, title: 'Unsupported image format' },
  { match: /invalid (png|jpeg|jpg|gif|bmp|tiff|webp|avif).*(signature|header|chunk)/i, title: 'Image file is corrupted' },
  { match: /unexpected eof|unexpected end of (file|stream|data)/i, title: 'Image file is incomplete or truncated' },
  { match: /icc/i, title: 'Invalid embedded color profile' },
  { match: /decode failed|failed to decode|could not decode/i, title: "Couldn't read the image" },

  // Encode — specific codecs first, then the generic catch-all.
  { match: /encoder.*not.*found|unknown encoder/i, title: 'Encoder not available in this build' },
  { match: /png optimization failed/i, title: 'PNG optimization failed' },
  { match: /jpeg compression/i, title: 'JPEG compression failed' },
  { match: /webp.*(encoder|encode)/i, title: 'WebP encoding failed' },
  { match: /encod(ing|er).*(failed|error)|failed to encode/i, title: "Couldn't encode the image" },

  // IO
  { match: /failed to read file/i, title: "Couldn't read the source file" },
  { match: /failed to write file/i, title: "Couldn't write the output file" },
];

const truncate = (s: string, max = 600): string =>
  s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;

/**
 * Map an image-pipeline error message to a friendly title + raw details.
 * Accepts strings, Error instances, or anything stringifiable.
 */
export const humanizeImageError = (raw: unknown): FriendlyError => {
  const text =
    raw instanceof Error ? raw.message : typeof raw === 'string' ? raw : String(raw ?? '');
  const normalized = text.trim();

  if (normalized.length === 0) {
    return { title: 'Unknown image-processing error', details: '' };
  }

  for (const { match, title } of PATTERNS) {
    if (match.test(normalized)) {
      return { title, details: truncate(normalized) };
    }
  }

  return { title: 'Image processing failed', details: truncate(normalized) };
};

// Re-export so callers only need to import from one place when handling
// image-pipeline results. The sentinels themselves are shared with video.
export { isCancelledError, isSkippedError };

type WithError = { success: boolean; error?: string | null };

/**
 * Find the first genuine failure in a batch (skipping the soft sentinels
 * `cancelled` / `skipped`) and return its humanized one-liner. Used by the
 * execution helpers to populate `processToast`'s `firstError` so a partial
 * batch surfaces at least one concrete reason for failure, not just a count.
 */
export const firstImageError = <R extends WithError>(results: R[]): string | undefined => {
  const failed = results.find(
    (r) => !r.success && !isCancelledError(r.error) && !isSkippedError(r.error)
  );
  return failed?.error ? humanizeImageError(failed.error).title : undefined;
};
