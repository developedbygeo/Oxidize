use rayon::prelude::*;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter, Manager};

const PROGRESS_EVENT: &str = "image:progress";

/// Tauri-managed cancel state for image batch operations. Simpler than
/// `VideoJobs` because there are no spawned child processes to track — just
/// a flag the parallel iterator checks before kicking off each work item.
#[derive(Default)]
pub struct ImageJobs {
    cancelled: AtomicBool,
}

impl ImageJobs {
    fn reset(&self) {
        self.cancelled.store(false, Ordering::Relaxed);
    }

    fn is_cancelled(&self) -> bool {
        self.cancelled.load(Ordering::Relaxed)
    }

    fn cancel(&self) {
        self.cancelled.store(true, Ordering::Relaxed);
    }
}

#[tauri::command]
pub fn cancel_image_jobs(app: AppHandle) {
    if let Some(jobs) = app.try_state::<ImageJobs>() {
        jobs.cancel();
    }
}

#[derive(Clone, serde::Serialize)]
struct ProgressPayload {
    input_path: String,
    /// 0.0..=1.0 — image batches don't have sub-file progress, so each
    /// completed file emits 1.0 and the bar sums across files to get overall.
    progress: f64,
}

/// Parallel batch driver shared by every `*_images_batch` command. Resets the
/// cancel flag at the start, runs `run_one` per input via rayon, emits an
/// `image:progress` event as each finishes, and short-circuits remaining items
/// to `make_cancelled` once the user cancels mid-run.
///
/// Items already in-flight when the cancel arrives finish their current work
/// — same semantics as the video batch driver.
pub fn run_image_batch<R, F, C>(
    app: &AppHandle,
    input_paths: Vec<String>,
    run_one: F,
    make_cancelled: C,
) -> Vec<R>
where
    R: Send,
    F: Fn(&str) -> R + Sync + Send,
    C: Fn(&str) -> R + Sync + Send,
{
    if let Some(jobs) = app.try_state::<ImageJobs>() {
        jobs.reset();
    }

    input_paths
        .par_iter()
        .map(|path| {
            let cancelled = app
                .try_state::<ImageJobs>()
                .map(|j| j.is_cancelled())
                .unwrap_or(false);

            let result = if cancelled {
                make_cancelled(path)
            } else {
                run_one(path)
            };

            // Emit progress whether we ran or short-circuited so the bar
            // still advances to 100% on cancel.
            let _ = app.emit(
                PROGRESS_EVENT,
                ProgressPayload {
                    input_path: path.clone(),
                    progress: 1.0,
                },
            );

            result
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_jobs_default_to_not_cancelled() {
        let jobs = ImageJobs::default();
        assert!(!jobs.is_cancelled());
    }

    #[test]
    fn cancel_sets_the_cancelled_flag() {
        let jobs = ImageJobs::default();
        jobs.cancel();
        assert!(jobs.is_cancelled());
    }

    #[test]
    fn reset_clears_a_previously_set_cancelled_flag() {
        let jobs = ImageJobs::default();
        jobs.cancel();
        assert!(jobs.is_cancelled());
        jobs.reset();
        assert!(!jobs.is_cancelled(), "reset should bring the flag back to false");
    }

    #[test]
    fn cancel_is_idempotent() {
        // Multiple Esc presses in a row shouldn't break anything.
        let jobs = ImageJobs::default();
        jobs.cancel();
        jobs.cancel();
        jobs.cancel();
        assert!(jobs.is_cancelled());
    }

    #[test]
    fn reset_then_cancel_round_trips() {
        // Mimics the lifecycle of two back-to-back batches: cancel the first,
        // then start a new one (which resets), then cancel that one too.
        let jobs = ImageJobs::default();
        jobs.cancel();
        jobs.reset();
        assert!(!jobs.is_cancelled());
        jobs.cancel();
        assert!(jobs.is_cancelled());
    }
}
