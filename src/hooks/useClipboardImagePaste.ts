import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { BaseDirectory, mkdir, writeFile, exists } from '@tauri-apps/plugin-fs';
import type { ImageInfo } from '@/types/image';

const CLIPBOARD_DIR = 'oxidize/clipboard';

const IMAGE_MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
};

type LoadResult = { Ok: ImageInfo } | { Err: string } | ImageInfo;

type UseClipboardImagePasteArgs = {
  /** Called with the freshly-loaded images once the paste completes. */
  onImagesAdded: (images: ImageInfo[]) => void;
  /** When false, the global listener is detached so other pages don't get
   *  paste events meant for an image page. */
  enabled?: boolean;
};

/**
 * Tag check that lets native paste (Ctrl/Cmd+V) still work inside the
 * OutputLocationPicker and the filename-template input. Without this guard
 * the global handler would steal the keystroke from every text field.
 */
const isEditableTarget = (el: Element | null): boolean => {
  if (!el) return false;
  if (el instanceof HTMLInputElement) return true;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLElement && el.isContentEditable) return true;
  return false;
};

const extForBlob = (blob: Blob): string | null => {
  const direct = IMAGE_MIME_TO_EXT[blob.type];
  if (direct) return direct;
  // Some platforms hand back a type like "image/png;charset=..." — strip
  // parameters and try again.
  const base = blob.type.split(';')[0]?.trim();
  return base ? IMAGE_MIME_TO_EXT[base] ?? null : null;
};

const findImageBlob = async (items: ClipboardItem[]): Promise<Blob | null> => {
  for (const item of items) {
    for (const type of item.types) {
      if (!type.startsWith('image/')) continue;
      try {
        const blob = await item.getType(type);
        if (extForBlob(blob)) return blob;
      } catch {
        // Some clipboard items advertise types they can't actually serve —
        // try the next one rather than blowing up the whole paste.
      }
    }
  }
  return null;
};

/**
 * Persist a clipboard blob to `$APPDATA/oxidize/clipboard/<timestamp>.<ext>`
 * and return its absolute path so it can be fed to `load_images_batch`.
 */
const writeBlobToTempFile = async (blob: Blob, ext: string): Promise<string> => {
  const dirExists = await exists(CLIPBOARD_DIR, { baseDir: BaseDirectory.AppData });
  if (!dirExists) {
    await mkdir(CLIPBOARD_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
  }
  const filename = `clipboard-${Date.now()}.${ext}`;
  const relativePath = `${CLIPBOARD_DIR}/${filename}`;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  await writeFile(relativePath, bytes, { baseDir: BaseDirectory.AppData });
  const base = await appDataDir();
  return join(base, 'oxidize', 'clipboard', filename);
};

const unwrapResult = (r: LoadResult): ImageInfo | null => {
  if (typeof r !== 'object' || r === null) return null;
  if ('Ok' in r) return r.Ok;
  if ('path' in r) return r as ImageInfo;
  return null;
};

/**
 * Listens for Ctrl/Cmd+V outside of editable fields. When the clipboard
 * holds an image, writes it to a temp file in AppData, loads it via the
 * standard `load_images_batch` pipeline, and hands the resulting
 * `ImageInfo[]` to the caller.
 *
 * Silent failure is intentional — non-image clipboard contents (plain text,
 * files, …) shouldn't shout at the user. We log to the console for
 * debugging and move on.
 */
export const useClipboardImagePaste = ({
  onImagesAdded,
  enabled = true,
}: UseClipboardImagePasteArgs) => {
  useEffect(() => {
    if (!enabled) return;

    const handler = async (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;
      if (e.key.toLowerCase() !== 'v') return;
      if (isEditableTarget(document.activeElement)) return;
      if (!navigator.clipboard?.read) return;

      let items: ClipboardItem[];
      try {
        items = await navigator.clipboard.read();
      } catch {
        // Permission denied or no clipboard access — quiet exit.
        return;
      }

      const blob = await findImageBlob(items);
      if (!blob) return;
      const ext = extForBlob(blob);
      if (!ext) return;

      // We have an image — only now do we suppress the default paste, so
      // we don't break native paste for non-image clipboard contents.
      e.preventDefault();

      try {
        const absolutePath = await writeBlobToTempFile(blob, ext);
        const results = await invoke<LoadResult[]>('load_images_batch', {
          paths: [absolutePath],
        });
        const loaded = results
          .map(unwrapResult)
          .filter((img): img is ImageInfo => img !== null);
        if (loaded.length > 0) onImagesAdded(loaded);
      } catch (err) {
        console.error('Failed to paste clipboard image:', err);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, onImagesAdded]);
};
