import { useEffect } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { getCurrentWindow } from '@tauri-apps/api/window';

export const useWindowTitle = () => {
  useEffect(() => {
    let cancelled = false;
    getVersion().then((version) => {
      if (cancelled) return;
      getCurrentWindow().setTitle(`Oxidize v${version}`);
    });
    return () => {
      cancelled = true;
    };
  }, []);
};
