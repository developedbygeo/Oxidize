/**
 * Reshape raw ffmpeg stderr into a one-line user-friendly title plus the
 * original error string as expandable details. The pattern matching here is
 * intentionally lenient — ffmpeg's error text varies across versions and
 * codecs, so we look for substrings rather than exact strings.
 */

export type FriendlyError = {
  title: string;
  /** Original message — surfaced as the toast description for debugging. */
  details: string;
};

/** Sentinel emitted by the backend when the user cancels mid-job. */
const CANCELLED_SENTINEL = 'cancelled';

const PATTERNS: ReadonlyArray<{ match: RegExp; title: string }> = [
  // Cancellation — exact sentinel, distinct from a real failure.
  { match: /^cancelled$/i, title: 'Cancelled' },

  // File system
  { match: /no such file or directory/i, title: 'File not found' },
  { match: /permission denied/i, title: 'Permission denied — check folder access' },
  { match: /no space left on device|disk full/i, title: 'Disk full' },
  { match: /read-only file system/i, title: 'Output folder is read-only' },

  // Codec / format
  { match: /unknown encoder|encoder not found/i, title: 'Codec not available in this ffmpeg build' },
  { match: /unknown decoder|decoder not found/i, title: 'Source codec not supported' },
  {
    match: /could not find tag for codec|incompatible codec/i,
    title: 'Codec is not compatible with the output container',
  },
  { match: /muxer not found/i, title: 'Output format not supported' },
  { match: /demuxer not found/i, title: 'Input format not recognized' },

  // Content
  { match: /moov atom not found|invalid data found when processing input/i, title: 'Input file is corrupted or incomplete' },
  { match: /invalid argument/i, title: 'Invalid encoding parameters' },
  { match: /unsupported codec/i, title: 'Unsupported codec' },

  // Process
  { match: /killed|received signal/i, title: 'ffmpeg was terminated' },
  { match: /ffmpeg exited with code/i, title: 'ffmpeg failed' },
];

const truncate = (s: string, max = 600): string =>
  s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;

/**
 * Map an ffmpeg-flavored error message to a friendly title + raw details.
 * `raw` can be the message string or any value that's been stringified — we
 * normalise to a trimmed string first.
 */
export const humanizeFfmpegError = (raw: unknown): FriendlyError => {
  const text =
    raw instanceof Error ? raw.message : typeof raw === 'string' ? raw : String(raw ?? '');
  const normalized = text.trim();

  if (normalized.length === 0) {
    return { title: 'Unknown ffmpeg error', details: '' };
  }

  for (const { match, title } of PATTERNS) {
    if (match.test(normalized)) {
      return { title, details: truncate(normalized) };
    }
  }

  return { title: 'ffmpeg failed', details: truncate(normalized) };
};

export const isCancelledError = (raw: unknown): boolean => {
  const text =
    raw instanceof Error ? raw.message : typeof raw === 'string' ? raw : String(raw ?? '');
  return text.trim().toLowerCase() === CANCELLED_SENTINEL;
};
