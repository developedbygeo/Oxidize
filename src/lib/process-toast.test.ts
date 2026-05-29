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
  it('shows a custom error message when provided', () => {
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
});
