import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ImageInfo } from '@/types/image';

const invoke = vi.fn();
const writeFile = vi.fn();
const mkdir = vi.fn();
const exists = vi.fn();
const appDataDir = vi.fn();
const join = vi.fn();
const clipboardRead = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}));

vi.mock('@tauri-apps/api/path', () => ({
  appDataDir: () => appDataDir(),
  join: (...parts: string[]) => join(...parts),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  BaseDirectory: { AppData: 'AppData' },
  writeFile: (...args: unknown[]) => writeFile(...args),
  mkdir: (...args: unknown[]) => mkdir(...args),
  exists: (...args: unknown[]) => exists(...args),
}));

const { useClipboardImagePaste } = await import('./useClipboardImagePaste');

const image = (overrides: Partial<ImageInfo> = {}): ImageInfo => ({
  path: '/temp/clipboard-1.png',
  name: 'clipboard-1.png',
  size: 100,
  width: 10,
  height: 10,
  format: 'png',
  thumbnail: '',
  ...overrides,
});

/** Build a fake ClipboardItem with the given mime types + a fixed blob. */
const fakeClipboardItem = (types: Record<string, Blob>): ClipboardItem =>
  ({
    types: Object.keys(types),
    getType: vi.fn(async (mime: string) => {
      const blob = types[mime];
      if (!blob) throw new Error('not available');
      return blob;
    }),
  }) as unknown as ClipboardItem;

const pngBlob = () => new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' });
const textBlob = () => new Blob(['hello'], { type: 'text/plain' });

const fireCtrlV = (target: Element | null = document.body) => {
  const event = new KeyboardEvent('keydown', {
    key: 'v',
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
  });
  // happy-dom lets us override target.
  if (target) Object.defineProperty(event, 'target', { value: target, configurable: true });
  window.dispatchEvent(event);
  return event;
};

beforeEach(() => {
  invoke.mockReset();
  writeFile.mockReset().mockResolvedValue(undefined);
  mkdir.mockReset().mockResolvedValue(undefined);
  exists.mockReset().mockResolvedValue(true);
  appDataDir.mockReset().mockResolvedValue('/app/data');
  join.mockReset().mockImplementation((...parts: string[]) => parts.join('/'));
  clipboardRead.mockReset();
  Object.defineProperty(globalThis.navigator, 'clipboard', {
    configurable: true,
    value: { read: () => clipboardRead() },
  });
});

afterEach(() => {
  // Ensure the next test starts with focus reset to body.
  (document.activeElement as HTMLElement | null)?.blur?.();
});

describe('useClipboardImagePaste', () => {
  it('writes a pasted PNG to AppData and forwards the loaded ImageInfo', async () => {
    const onImagesAdded = vi.fn();
    clipboardRead.mockResolvedValue([fakeClipboardItem({ 'image/png': pngBlob() })]);
    invoke.mockResolvedValue([{ Ok: image() }]);

    renderHook(() => useClipboardImagePaste({ onImagesAdded }));

    fireCtrlV();
    // Let the async chain settle (clipboard read → write → invoke).
    await vi.waitFor(() => expect(invoke).toHaveBeenCalled());

    expect(writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/^oxidize\/clipboard\/clipboard-\d+\.png$/),
      expect.any(Uint8Array),
      { baseDir: 'AppData' }
    );
    expect(invoke).toHaveBeenCalledWith('load_images_batch', {
      paths: [expect.stringContaining('/clipboard/clipboard-')],
    });
    await vi.waitFor(() => expect(onImagesAdded).toHaveBeenCalledWith([expect.objectContaining({ path: '/temp/clipboard-1.png' })]));
  });

  it('does not steal the keystroke when focus is inside an input', async () => {
    const onImagesAdded = vi.fn();
    clipboardRead.mockResolvedValue([fakeClipboardItem({ 'image/png': pngBlob() })]);
    renderHook(() => useClipboardImagePaste({ onImagesAdded }));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const event = fireCtrlV(input);
    // Give the (unscheduled) async chain a chance — should do nothing.
    await new Promise((r) => setTimeout(r, 10));

    expect(event.defaultPrevented).toBe(false);
    expect(clipboardRead).not.toHaveBeenCalled();
    expect(onImagesAdded).not.toHaveBeenCalled();
    input.remove();
  });

  it('does not steal the keystroke when focus is inside a textarea or contentEditable', async () => {
    const onImagesAdded = vi.fn();
    clipboardRead.mockResolvedValue([fakeClipboardItem({ 'image/png': pngBlob() })]);
    renderHook(() => useClipboardImagePaste({ onImagesAdded }));

    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    ta.focus();
    fireCtrlV(ta);
    await new Promise((r) => setTimeout(r, 10));
    expect(clipboardRead).not.toHaveBeenCalled();
    ta.remove();

    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    document.body.appendChild(editable);
    editable.focus();
    fireCtrlV(editable);
    await new Promise((r) => setTimeout(r, 10));
    expect(clipboardRead).not.toHaveBeenCalled();
    editable.remove();
  });

  it('is a no-op when the clipboard only holds non-image content', async () => {
    const onImagesAdded = vi.fn();
    clipboardRead.mockResolvedValue([fakeClipboardItem({ 'text/plain': textBlob() })]);
    renderHook(() => useClipboardImagePaste({ onImagesAdded }));

    const event = fireCtrlV();
    await vi.waitFor(() => expect(clipboardRead).toHaveBeenCalled());

    // We didn't preventDefault because the clipboard had no image — native
    // paste should still work for whatever other context the user was in.
    expect(event.defaultPrevented).toBe(false);
    expect(writeFile).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
    expect(onImagesAdded).not.toHaveBeenCalled();
  });

  it('swallows clipboard.read() rejections (permission denied, etc.)', async () => {
    const onImagesAdded = vi.fn();
    clipboardRead.mockRejectedValue(new Error('NotAllowedError'));
    renderHook(() => useClipboardImagePaste({ onImagesAdded }));

    fireCtrlV();
    await new Promise((r) => setTimeout(r, 10));
    expect(invoke).not.toHaveBeenCalled();
    expect(onImagesAdded).not.toHaveBeenCalled();
  });

  it('detaches the listener when enabled flips to false', async () => {
    const onImagesAdded = vi.fn();
    clipboardRead.mockResolvedValue([fakeClipboardItem({ 'image/png': pngBlob() })]);
    const { rerender } = renderHook(
      ({ on }: { on: boolean }) => useClipboardImagePaste({ onImagesAdded, enabled: on }),
      { initialProps: { on: true } }
    );
    rerender({ on: false });

    fireCtrlV();
    await new Promise((r) => setTimeout(r, 10));
    expect(clipboardRead).not.toHaveBeenCalled();
  });

  it('does not fire on plain V without a modifier', async () => {
    const onImagesAdded = vi.fn();
    clipboardRead.mockResolvedValue([fakeClipboardItem({ 'image/png': pngBlob() })]);
    renderHook(() => useClipboardImagePaste({ onImagesAdded }));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', bubbles: true }));
    await new Promise((r) => setTimeout(r, 10));
    expect(clipboardRead).not.toHaveBeenCalled();
  });

  it('strips MIME parameters when detecting an image type', async () => {
    const onImagesAdded = vi.fn();
    const blob = new Blob([new Uint8Array([0x89])], { type: 'image/png;charset=binary' });
    clipboardRead.mockResolvedValue([fakeClipboardItem({ 'image/png;charset=binary': blob })]);
    invoke.mockResolvedValue([{ Ok: image() }]);
    renderHook(() => useClipboardImagePaste({ onImagesAdded }));

    fireCtrlV();
    await vi.waitFor(() => expect(invoke).toHaveBeenCalled());
    expect(writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/\.png$/),
      expect.any(Uint8Array),
      expect.any(Object)
    );
  });
});
