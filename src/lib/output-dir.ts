import { open } from '@tauri-apps/plugin-dialog';

/**
 * Opens the OS folder picker and returns the chosen path, or null if cancelled.
 */
export const pickOutputDir = async (): Promise<string | null> => {
  const selected = await open({ directory: true, multiple: false });
  return typeof selected === 'string' ? selected : null;
};
