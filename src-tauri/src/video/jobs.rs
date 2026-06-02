use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use tauri_plugin_shell::process::CommandChild;

/// Tauri-managed cancel state: tracks active ffmpeg children for kill-all and a between-file flag for batch loops.
#[derive(Default)]
pub struct VideoJobs {
    active: Mutex<HashMap<String, CommandChild>>,
    cancelled: AtomicBool,
}

impl VideoJobs {
    pub(super) fn reset(&self) {
        self.cancelled.store(false, Ordering::Relaxed);
        if let Ok(mut active) = self.active.lock() {
            active.clear();
        }
    }

    pub(super) fn is_cancelled(&self) -> bool {
        self.cancelled.load(Ordering::Relaxed)
    }

    pub(super) fn register(&self, path: String, child: CommandChild) {
        if let Ok(mut active) = self.active.lock() {
            active.insert(path, child);
        }
    }

    pub(super) fn unregister(&self, path: &str) {
        if let Ok(mut active) = self.active.lock() {
            active.remove(path);
        }
    }

    fn cancel_all(&self) {
        self.cancelled.store(true, Ordering::Relaxed);
        if let Ok(mut active) = self.active.lock() {
            for (_, child) in active.drain() {
                let _ = child.kill();
            }
        }
    }
}

#[tauri::command]
pub fn cancel_video_jobs(app: AppHandle) {
    if let Some(jobs) = app.try_state::<VideoJobs>() {
        jobs.cancel_all();
    }
}
