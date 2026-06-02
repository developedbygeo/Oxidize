import { describe, expect, it } from 'vitest';
import { humanizeFfmpegError, isCancelledError, isSkippedError } from './ffmpeg-errors';

describe('humanizeFfmpegError', () => {
  it('returns Cancelled for the cancellation sentinel', () => {
    expect(humanizeFfmpegError('cancelled')).toEqual({
      title: 'Cancelled',
      details: 'cancelled',
    });
  });

  it('matches "no such file or directory" → File not found', () => {
    expect(humanizeFfmpegError('Error: No such file or directory').title).toBe('File not found');
  });

  it('matches permission errors', () => {
    expect(humanizeFfmpegError('Permission denied').title).toMatch(/Permission denied/);
  });

  it('matches disk-full variants', () => {
    expect(humanizeFfmpegError('No space left on device').title).toBe('Disk full');
    expect(humanizeFfmpegError('disk full').title).toBe('Disk full');
  });

  it('matches read-only file system', () => {
    expect(humanizeFfmpegError('Read-only file system').title).toBe('Output folder is read-only');
  });

  it('routes encoder/decoder issues distinctly', () => {
    expect(humanizeFfmpegError('Unknown encoder libx265').title).toMatch(
      /Codec not available/i
    );
    expect(humanizeFfmpegError('Unknown decoder hevc').title).toMatch(/Source codec/i);
  });

  it('matches container/codec mismatch', () => {
    expect(humanizeFfmpegError('could not find tag for codec aac').title).toMatch(
      /not compatible with the output container/i
    );
  });

  it('matches moov-atom / invalid input data → corrupted', () => {
    expect(humanizeFfmpegError('moov atom not found').title).toMatch(/corrupted or incomplete/i);
    expect(humanizeFfmpegError('Invalid data found when processing input').title).toMatch(
      /corrupted/i
    );
  });

  it('truncates very long messages with an ellipsis', () => {
    const huge = 'ffmpeg exited with code 1:\n' + 'x'.repeat(10_000);
    const { details } = humanizeFfmpegError(huge);
    expect(details.length).toBeLessThan(700);
    expect(details.endsWith('…')).toBe(true);
  });

  it('handles Error instances by reading .message', () => {
    expect(humanizeFfmpegError(new Error('Permission denied')).title).toMatch(
      /Permission denied/
    );
  });

  it('returns a friendly default for empty input', () => {
    expect(humanizeFfmpegError('').title).toBe('Unknown ffmpeg error');
    expect(humanizeFfmpegError(null).title).toBe('Unknown ffmpeg error');
    expect(humanizeFfmpegError(undefined).title).toBe('Unknown ffmpeg error');
  });

  it('falls back to "ffmpeg failed" for unmatched messages', () => {
    expect(humanizeFfmpegError('Some weird unknown stderr').title).toBe('ffmpeg failed');
  });

  it('preserves the original message in details', () => {
    const msg = 'ffmpeg exited with code 1:\n[h264 @ 0x55] mb_type 23 invalid';
    expect(humanizeFfmpegError(msg).details).toBe(msg);
  });
});

describe('isCancelledError', () => {
  it('returns true only for the exact sentinel', () => {
    expect(isCancelledError('cancelled')).toBe(true);
    expect(isCancelledError('Cancelled')).toBe(true);
    expect(isCancelledError('  cancelled  ')).toBe(true);
  });

  it('returns false for anything else', () => {
    expect(isCancelledError('cancel')).toBe(false);
    expect(isCancelledError('user cancelled the operation')).toBe(false);
    expect(isCancelledError('Permission denied')).toBe(false);
    expect(isCancelledError('')).toBe(false);
    expect(isCancelledError(null)).toBe(false);
  });
});

describe('isSkippedError', () => {
  it('returns true only for the exact sentinel', () => {
    expect(isSkippedError('skipped')).toBe(true);
    expect(isSkippedError('Skipped')).toBe(true);
    expect(isSkippedError('  skipped  ')).toBe(true);
  });

  it('returns false for anything else, including cancelled', () => {
    expect(isSkippedError('cancelled')).toBe(false);
    expect(isSkippedError('skip')).toBe(false);
    expect(isSkippedError('output was skipped because exists')).toBe(false);
    expect(isSkippedError('Permission denied')).toBe(false);
    expect(isSkippedError('')).toBe(false);
    expect(isSkippedError(null)).toBe(false);
  });

  it('humanizeFfmpegError routes the sentinel through a friendly title', () => {
    expect(humanizeFfmpegError('skipped').title).toMatch(/Skipped/);
  });
});
