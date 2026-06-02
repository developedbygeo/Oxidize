use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

/// Sub-path under `$APPDATA` where `useClipboardImagePaste` drops blobs.
/// Kept in sync with the FE constant in `src/hooks/useClipboardImagePaste.ts`.
const CLIPBOARD_DIR: &str = "oxidize/clipboard";

/// Best-effort cleanup of leftover clipboard-paste blobs. Called once at
/// app start, before any FE code runs. Failures are swallowed — a stale
/// temp file is harmless on its own, and we don't want startup to fail
/// on filesystem oddities (locked file, missing dir, etc.).
pub fn sweep_on_startup(app: &AppHandle) {
    let Ok(base) = app.path().app_data_dir() else {
        return;
    };
    let dir = base.join(CLIPBOARD_DIR);
    sweep_clipboard_temp_dir(&dir);
}

/// Pure(ish) version that takes the directory explicitly so it's
/// trivially testable. Files only — never recurses into subdirs, never
/// touches the dir itself (so the writer hook doesn't need to recreate
/// it next time the app starts).
pub fn sweep_clipboard_temp_dir(dir: &Path) -> SweepReport {
    let mut report = SweepReport::default();
    let Ok(entries) = std::fs::read_dir(dir) else {
        // Dir doesn't exist yet (first run) or unreadable — both fine.
        return report;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if !is_file(&path) {
            continue;
        }
        match std::fs::remove_file(&path) {
            Ok(_) => report.deleted += 1,
            Err(_) => report.failed += 1,
        }
    }
    report
}

fn is_file(path: &PathBuf) -> bool {
    std::fs::metadata(path)
        .map(|m| m.is_file())
        .unwrap_or(false)
}

/// Returned by `sweep_clipboard_temp_dir` so callers (and tests) can
/// inspect what happened. Startup ignores it.
#[derive(Debug, Default, PartialEq, Eq)]
pub struct SweepReport {
    pub deleted: usize,
    pub failed: usize,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{self, File};

    #[test]
    fn sweep_returns_empty_report_when_dir_does_not_exist() {
        let tmp = tempfile::tempdir().unwrap();
        let missing = tmp.path().join("nope");
        let report = sweep_clipboard_temp_dir(&missing);
        assert_eq!(report, SweepReport { deleted: 0, failed: 0 });
    }

    #[test]
    fn sweep_deletes_every_top_level_file() {
        let tmp = tempfile::tempdir().unwrap();
        for name in ["a.png", "b.jpg", "c.webp"] {
            File::create(tmp.path().join(name)).unwrap();
        }
        let report = sweep_clipboard_temp_dir(tmp.path());
        assert_eq!(report.deleted, 3);
        assert_eq!(report.failed, 0);
        assert!(tmp.path().read_dir().unwrap().next().is_none(), "dir should be empty after sweep");
    }

    #[test]
    fn sweep_preserves_the_directory_itself() {
        // The FE hook expects the dir to keep existing if it ever did; we
        // only nuke contents. Otherwise the next paste would race on mkdir.
        let tmp = tempfile::tempdir().unwrap();
        File::create(tmp.path().join("a.png")).unwrap();
        sweep_clipboard_temp_dir(tmp.path());
        assert!(tmp.path().exists());
        assert!(tmp.path().is_dir());
    }

    #[test]
    fn sweep_skips_subdirectories() {
        // Defensive: if anything ever creates a subdir under clipboard/,
        // we should not silently nuke its contents.
        let tmp = tempfile::tempdir().unwrap();
        File::create(tmp.path().join("a.png")).unwrap();
        let nested = tmp.path().join("nested");
        fs::create_dir(&nested).unwrap();
        File::create(nested.join("keep.png")).unwrap();

        let report = sweep_clipboard_temp_dir(tmp.path());
        assert_eq!(report.deleted, 1, "only the top-level file should be deleted");
        assert!(nested.exists(), "subdir should still exist");
        assert!(nested.join("keep.png").exists(), "files in subdirs should not be touched");
    }
}
