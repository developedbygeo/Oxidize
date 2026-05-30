import { describe, expect, it } from 'vitest';
import { humanizeImageError, isCancelledError, isSkippedError } from './image-errors';

describe('humanizeImageError', () => {
  it('routes the cancellation sentinel through the same title as the ffmpeg side', () => {
    expect(humanizeImageError('cancelled').title).toBe('Cancelled');
  });

  it('routes the skipped sentinel through the same title as the ffmpeg side', () => {
    expect(humanizeImageError('skipped').title).toMatch(/Skipped/);
  });

  it('flags missing source files', () => {
    expect(humanizeImageError('No such file or directory').title).toBe('File not found');
    expect(humanizeImageError("ImageReader could not find /tmp/a.png").title).toBe('File not found');
  });

  it('flags permission errors', () => {
    expect(humanizeImageError('Permission denied (os error 13)').title).toMatch(/Permission denied/);
    expect(humanizeImageError('Access is denied. (os error 5)').title).toMatch(/Permission denied/);
  });

  it('flags disk-full and read-only filesystems', () => {
    expect(humanizeImageError('No space left on device').title).toBe('Disk full');
    expect(humanizeImageError('Read-only file system').title).toBe('Output folder is read-only');
  });

  it('flags decode failures with a friendly title', () => {
    // Common shapes coming out of the image crate.
    expect(humanizeImageError('Decode failed: invalid PNG signature').title).toBe(
      'Image file is corrupted'
    );
    expect(humanizeImageError('failed to decode image: invalid jpeg signature').title).toBe(
      'Image file is corrupted'
    );
    expect(humanizeImageError("could not decode the image data").title).toMatch(/read the image/i);
  });

  it('flags unsupported formats', () => {
    expect(humanizeImageError('Unsupported format: heic').title).toBe('Unsupported image format');
    expect(humanizeImageError('Unsupported color type: Rgba16').title).toBe(
      'Unsupported image format'
    );
  });

  it('flags truncated / incomplete files', () => {
    expect(humanizeImageError('unexpected EOF while parsing PNG').title).toMatch(
      /incomplete or truncated/i
    );
    expect(humanizeImageError('unexpected end of stream').title).toMatch(
      /incomplete or truncated/i
    );
  });

  it('flags ICC profile parse errors', () => {
    expect(humanizeImageError('failed to parse ICC profile').title).toMatch(/color profile/i);
  });

  it('flags encoder failures distinctly from decode failures', () => {
    expect(humanizeImageError('PNG optimization failed: out of bounds').title).toBe(
      'PNG optimization failed'
    );
    expect(humanizeImageError('Failed to start JPEG compression').title).toBe(
      'JPEG compression failed'
    );
    expect(humanizeImageError('WebP encoder error: bad palette').title).toBe(
      'WebP encoding failed'
    );
    expect(humanizeImageError('Failed to encode image').title).toMatch(/encode the image/i);
  });

  it('flags out-of-memory situations', () => {
    expect(humanizeImageError('memory allocation of 4000000000 bytes failed').title).toMatch(
      /Out of memory/
    );
    expect(humanizeImageError('Out of memory while decoding').title).toMatch(/Out of memory/);
  });

  it('flags too-large images', () => {
    expect(humanizeImageError('image too large for canvas').title).toMatch(/too large/i);
    expect(humanizeImageError('image dimensions are too large to process').title).toMatch(/too large/i);
  });

  it('flags IO failures distinctly from decode/encode failures', () => {
    expect(humanizeImageError('Failed to read file: locked by another process').title).toMatch(
      /read the source file/i
    );
    expect(humanizeImageError('Failed to write file: handle closed').title).toMatch(
      /write the output file/i
    );
  });

  it('truncates very long error messages with an ellipsis', () => {
    const huge = 'PNG optimization failed: ' + 'x'.repeat(10_000);
    const { details } = humanizeImageError(huge);
    expect(details.length).toBeLessThan(700);
    expect(details.endsWith('…')).toBe(true);
  });

  it('falls back to a generic title for unmatched messages', () => {
    expect(humanizeImageError('some weird crate-internal error').title).toBe(
      'Image processing failed'
    );
  });

  it('handles Error instances by reading .message', () => {
    expect(humanizeImageError(new Error('Permission denied')).title).toMatch(/Permission denied/);
  });

  it('returns the unknown-error fallback for empty input', () => {
    expect(humanizeImageError('').title).toBe('Unknown image-processing error');
    expect(humanizeImageError(null).title).toBe('Unknown image-processing error');
    expect(humanizeImageError(undefined).title).toBe('Unknown image-processing error');
  });

  it('preserves the original message in details', () => {
    const msg = 'PNG optimization failed: out of bounds at offset 1024';
    expect(humanizeImageError(msg).details).toBe(msg);
  });

  it('re-exports the shared sentinel helpers so callers have one import', () => {
    // Quick smoke checks — full coverage is in ffmpeg-errors.test.ts.
    expect(isCancelledError('cancelled')).toBe(true);
    expect(isSkippedError('skipped')).toBe(true);
    expect(isCancelledError('Permission denied')).toBe(false);
    expect(isSkippedError('Permission denied')).toBe(false);
  });
});
