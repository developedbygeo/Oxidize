import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProcessToast } from './process-toast';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn(() => 'mock-toast-id'),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

const mockedToast = vi.mocked(toast);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createProcessToast', () => {
  it('opens a loading toast with pluralized count', () => {
    createProcessToast({ progressLabel: 'Converting', doneLabel: 'Conversion', itemCount: 3 });
    expect(mockedToast.loading).toHaveBeenCalledWith('Converting 3 images...');
  });

  it('uses singular form for itemCount === 1', () => {
    createProcessToast({ progressLabel: 'Cropping', doneLabel: 'Crop', itemCount: 1 });
    expect(mockedToast.loading).toHaveBeenCalledWith('Cropping 1 image...');
  });

  it('respects a custom itemName', () => {
    createProcessToast({
      progressLabel: 'Trimming',
      doneLabel: 'Trim',
      itemCount: 2,
      itemName: 'video',
    });
    expect(mockedToast.loading).toHaveBeenCalledWith('Trimming 2 videos...');
  });
});

describe('createProcessToast.finish', () => {
  it('shows success when all succeeded', () => {
    const t = createProcessToast({ progressLabel: 'P', doneLabel: 'Done', itemCount: 3 });
    t.finish({ successCount: 3, failCount: 0 });
    expect(mockedToast.success).toHaveBeenCalledWith('Done complete', {
      id: 'mock-toast-id',
      description: '3 images processed successfully',
    });
  });

  it('appends extraInfo to the success description', () => {
    const t = createProcessToast({ progressLabel: 'P', doneLabel: 'Done', itemCount: 1 });
    t.finish({ successCount: 1, failCount: 0, extraInfo: '12.4 MB saved' });
    expect(mockedToast.success).toHaveBeenCalledWith('Done complete', {
      id: 'mock-toast-id',
      description: '1 image processed · 12.4 MB saved',
    });
  });

  it('shows a warning when there is partial success', () => {
    const t = createProcessToast({ progressLabel: 'P', doneLabel: 'Done', itemCount: 5 });
    t.finish({ successCount: 3, failCount: 2 });
    expect(mockedToast.warning).toHaveBeenCalledWith('Done partially complete', {
      id: 'mock-toast-id',
      description: '3 succeeded, 2 failed',
    });
  });

  it('shows an error when everything failed', () => {
    const t = createProcessToast({ progressLabel: 'P', doneLabel: 'Done', itemCount: 2 });
    t.finish({ successCount: 0, failCount: 2 });
    expect(mockedToast.error).toHaveBeenCalledWith('Done failed', {
      id: 'mock-toast-id',
      description: 'No images were processed successfully',
    });
  });
});

describe('createProcessToast.error', () => {
  it('shows a custom error message when provided as a string', () => {
    const t = createProcessToast({ progressLabel: 'P', doneLabel: 'Done', itemCount: 1 });
    t.error('Disk full');
    expect(mockedToast.error).toHaveBeenCalledWith('Done failed', {
      id: 'mock-toast-id',
      description: 'Disk full',
    });
  });

  it('falls back to default copy when no message is given', () => {
    const t = createProcessToast({
      progressLabel: 'P',
      doneLabel: 'Done',
      itemCount: 1,
      itemName: 'video',
    });
    t.error();
    expect(mockedToast.error).toHaveBeenCalledWith('Done failed', {
      id: 'mock-toast-id',
      description: 'No videos were processed successfully',
    });
  });

  it('accepts a structured { title, description } object', () => {
    const t = createProcessToast({ progressLabel: 'P', doneLabel: 'Done', itemCount: 1 });
    t.error({ title: 'Permission denied', description: 'EACCES on /out/foo.mp4' });
    expect(mockedToast.error).toHaveBeenCalledWith('Permission denied', {
      id: 'mock-toast-id',
      description: 'EACCES on /out/foo.mp4',
    });
  });

  it('uses the default failTitle when the title is omitted from the object form', () => {
    const t = createProcessToast({ progressLabel: 'P', doneLabel: 'Done', itemCount: 1 });
    t.error({ description: 'something went wrong' });
    expect(mockedToast.error).toHaveBeenCalledWith('Done failed', {
      id: 'mock-toast-id',
      description: 'something went wrong',
    });
  });
});

describe('createProcessToast.cancelled', () => {
  it('shows a warning with a no-progress description when nothing finished', () => {
    const t = createProcessToast({
      progressLabel: 'P',
      doneLabel: 'Conversion',
      itemCount: 3,
      itemName: 'video',
    });
    t.cancelled(0);
    expect(mockedToast.warning).toHaveBeenCalledWith('Conversion cancelled', {
      id: 'mock-toast-id',
      description: 'No videos were processed before cancel',
    });
  });

  it('reports partial progress when some items finished', () => {
    const t = createProcessToast({
      progressLabel: 'P',
      doneLabel: 'Trim',
      itemCount: 4,
      itemName: 'video',
    });
    t.cancelled(2);
    expect(mockedToast.warning).toHaveBeenCalledWith('Trim cancelled', {
      id: 'mock-toast-id',
      description: '2 videos finished before cancel',
    });
  });

  it('singularises the description when only one item finished', () => {
    const t = createProcessToast({
      progressLabel: 'P',
      doneLabel: 'Resize',
      itemCount: 3,
      itemName: 'image',
    });
    t.cancelled(1);
    expect(mockedToast.warning).toHaveBeenCalledWith('Resize cancelled', {
      id: 'mock-toast-id',
      description: '1 image finished before cancel',
    });
  });
});

describe('createProcessToast.skipped', () => {
  it('shows a pure-skip warning when nothing succeeded', () => {
    const t = createProcessToast({
      progressLabel: 'P',
      doneLabel: 'Conversion',
      itemCount: 3,
    });
    t.skipped({ successCount: 0, skipCount: 3 });
    expect(mockedToast.warning).toHaveBeenCalledWith('Conversion skipped', {
      id: 'mock-toast-id',
      description: '3 images skipped — output already exists',
    });
  });

  it('shows a partially-complete warning when some succeeded and some were skipped', () => {
    const t = createProcessToast({
      progressLabel: 'P',
      doneLabel: 'Compression',
      itemCount: 5,
    });
    t.skipped({ successCount: 3, skipCount: 2 });
    expect(mockedToast.warning).toHaveBeenCalledWith('Compression partially complete', {
      id: 'mock-toast-id',
      description: '3 images processed, 2 skipped',
    });
  });

  it('singularises both counts when only one of each', () => {
    const t = createProcessToast({
      progressLabel: 'P',
      doneLabel: 'Crop',
      itemCount: 2,
    });
    t.skipped({ successCount: 1, skipCount: 1 });
    expect(mockedToast.warning).toHaveBeenCalledWith('Crop partially complete', {
      id: 'mock-toast-id',
      description: '1 image processed, 1 skipped',
    });
  });
});
