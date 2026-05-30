import { describe, expect, it } from 'vitest';
import {
  FILE_SIZE_WARNING_BYTES,
  fileSizeWarning,
} from './file-size-warnings';

const MB = 1024 * 1024;
const GB = 1024 * 1024 * 1024;

describe('fileSizeWarning', () => {
  it('returns null when every file is under the image threshold', () => {
    expect(
      fileSizeWarning([{ name: 'tiny.png', size: 5 * MB }], 'image')
    ).toBeNull();
  });

  it('returns null when every file is under the video threshold', () => {
    expect(
      fileSizeWarning([{ name: 'clip.mp4', size: 500 * MB }], 'video')
    ).toBeNull();
  });

  it('flags a single image above the 100MB image threshold', () => {
    const warning = fileSizeWarning(
      [{ name: 'huge.tiff', size: FILE_SIZE_WARNING_BYTES.image + 1 }],
      'image'
    );
    expect(warning).not.toBeNull();
    expect(warning?.title).toBe('Large image loaded');
    expect(warning?.description).toContain('huge.tiff');
    expect(warning?.description).toMatch(/MB|GB/);
  });

  it('flags a single video above the 2GB video threshold', () => {
    const warning = fileSizeWarning(
      [{ name: 'movie.mkv', size: 3 * GB }],
      'video'
    );
    expect(warning).not.toBeNull();
    expect(warning?.title).toBe('Large video loaded');
    expect(warning?.description).toContain('movie.mkv');
  });

  it('summarises multiple large files in the title', () => {
    const warning = fileSizeWarning(
      [
        { name: 'a.tiff', size: 200 * MB },
        { name: 'b.tiff', size: 300 * MB },
      ],
      'image'
    );
    expect(warning?.title).toBe('2 large images loaded');
    expect(warning?.description).toContain('a.tiff');
    expect(warning?.description).toContain('b.tiff');
  });

  it('caps inline named files at 3 and shows "and N more" for the rest', () => {
    const files = Array.from({ length: 5 }, (_, i) => ({
      name: `file${i}.tiff`,
      size: 250 * MB,
    }));
    const warning = fileSizeWarning(files, 'image');
    expect(warning?.title).toBe('5 large images loaded');
    expect(warning?.description).toContain('file0.tiff');
    expect(warning?.description).toContain('file1.tiff');
    expect(warning?.description).toContain('file2.tiff');
    expect(warning?.description).not.toContain('file3.tiff');
    expect(warning?.description).toContain('and 2 more');
  });

  it('ignores files at or below the threshold', () => {
    const warning = fileSizeWarning(
      [
        { name: 'edge.png', size: FILE_SIZE_WARNING_BYTES.image },
        { name: 'over.png', size: FILE_SIZE_WARNING_BYTES.image + 1 },
      ],
      'image'
    );
    expect(warning?.title).toBe('Large image loaded');
    expect(warning?.description).toContain('over.png');
    expect(warning?.description).not.toContain('edge.png');
  });
});
