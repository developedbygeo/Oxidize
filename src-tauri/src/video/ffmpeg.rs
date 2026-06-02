use std::future::Future;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

use crate::types::VideoResult;

use super::jobs::VideoJobs;

const PROGRESS_EVENT: &str = "video:progress";

#[derive(Debug, Clone, serde::Serialize)]
struct ProgressPayload {
    input_path: String,
    /// Fraction 0.0..=1.0
    progress: f64,
    /// Encoded media duration so far, in seconds.
    out_time_seconds: f64,
}

/// Runs ffmpeg with progress emission to `video:progress` events.
/// Caller provides all ffmpeg args except `-progress -` and `-nostats`,
/// which are added here.
pub(super) async fn run_ffmpeg_with_progress(
    app: &AppHandle,
    input_path: &str,
    duration_seconds: f64,
    mut args: Vec<String>,
) -> Result<(), String> {
    args.insert(0, "-y".into());
    args.push("-progress".into());
    args.push("-".into());
    args.push("-nostats".into());

    let shell = app.shell();
    let command = shell
        .sidecar("ffmpeg")
        .map_err(|e| format!("Failed to locate ffmpeg sidecar: {}", e))?
        .args(args);

    let (mut rx, child) = command
        .spawn()
        .map_err(|e| format!("ffmpeg spawn failed: {}", e))?;

    // Register the child so cancel_video_jobs can kill it.
    if let Some(jobs) = app.try_state::<VideoJobs>() {
        jobs.register(input_path.to_string(), child);
    }

    let mut stderr_buf = String::new();
    let mut exit_code: Option<i32> = None;

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line) => {
                let text = String::from_utf8_lossy(&line);
                for kv in text.lines() {
                    if let Some(value) = kv.strip_prefix("out_time_us=") {
                        if let Ok(micros) = value.trim().parse::<u64>() {
                            let out_time_seconds = micros as f64 / 1_000_000.0;
                            let progress = if duration_seconds > 0.0 {
                                (out_time_seconds / duration_seconds).clamp(0.0, 1.0)
                            } else {
                                0.0
                            };
                            let _ = app.emit(
                                PROGRESS_EVENT,
                                ProgressPayload {
                                    input_path: input_path.to_string(),
                                    progress,
                                    out_time_seconds,
                                },
                            );
                        }
                    }
                }
            }
            CommandEvent::Stderr(line) => {
                stderr_buf.push_str(&String::from_utf8_lossy(&line));
                stderr_buf.push('\n');
            }
            CommandEvent::Terminated(payload) => {
                exit_code = payload.code;
            }
            _ => {}
        }
    }

    // Always clear our registry entry once the process is gone.
    if let Some(jobs) = app.try_state::<VideoJobs>() {
        jobs.unregister(input_path);
    }

    // If we were asked to cancel, surface a clear error regardless of how
    // ffmpeg exited (killed processes can report odd codes or none at all).
    if let Some(jobs) = app.try_state::<VideoJobs>() {
        if jobs.is_cancelled() {
            return Err("cancelled".to_string());
        }
    }

    match exit_code {
        Some(0) => Ok(()),
        Some(code) => Err(format!("ffmpeg exited with code {}:\n{}", code, stderr_buf)),
        None => Err(format!("ffmpeg terminated without exit code:\n{}", stderr_buf)),
    }
}

pub(super) fn extension_for_format(format: &str) -> String {
    format.to_lowercase()
}

pub(super) fn default_video_codec_for(format: &str) -> &'static str {
    match format.to_lowercase().as_str() {
        "webm" => "libvpx-vp9",
        "mkv" | "mp4" | "mov" => "libx264",
        "avi" => "libx264",
        _ => "libx264",
    }
}

pub(super) fn default_audio_codec_for(format: &str) -> &'static str {
    match format.to_lowercase().as_str() {
        "webm" => "libopus",
        _ => "aac",
    }
}

/// Codec-specific speed/threading flags. Different codecs accept very
/// different tunables (`-preset` for x264/x265, `-cpu-used`+`-row-mt`+
/// `-deadline` for VP9, none for stream-copy). `preset` is only honored
/// when the codec supports it.
pub(super) fn codec_speed_args(codec: &str, preset: Option<&str>) -> Vec<String> {
    match codec {
        "libx264" | "libx265" => vec![
            "-preset".into(),
            preset.unwrap_or("medium").into(),
        ],
        "libvpx-vp9" => vec![
            // Multi-row threading + a moderately fast quality preset.
            // -cpu-used 4 gives ~4-8x speedup over the default (0) at a small
            // quality cost; -row-mt 1 enables row-based multithreading.
            "-row-mt".into(),
            "1".into(),
            "-cpu-used".into(),
            "4".into(),
            "-deadline".into(),
            "good".into(),
        ],
        "libvpx" => vec![
            "-cpu-used".into(),
            "4".into(),
            "-deadline".into(),
            "good".into(),
        ],
        // "copy" (remux) and unknown codecs get no extras.
        _ => vec![],
    }
}

/// Cancel-aware batch driver shared by all video op batch commands.
pub(super) async fn run_video_batch<O, F, Fut>(
    app: AppHandle,
    input_paths: Vec<String>,
    options: O,
    run_one: F,
) -> Vec<VideoResult>
where
    O: Clone,
    F: Fn(AppHandle, String, O) -> Fut,
    Fut: Future<Output = Result<VideoResult, String>>,
{
    if let Some(jobs) = app.try_state::<VideoJobs>() {
        jobs.reset();
    }
    let mut results = Vec::with_capacity(input_paths.len());
    for path in input_paths {
        if let Some(jobs) = app.try_state::<VideoJobs>() {
            if jobs.is_cancelled() {
                results.push(VideoResult {
                    success: false,
                    input_path: path,
                    output_path: None,
                    error: Some("cancelled".into()),
                    original_size: 0,
                    new_size: 0,
                });
                continue;
            }
        }
        let result = run_one(app.clone(), path.clone(), options.clone())
            .await
            .unwrap_or_else(|e| VideoResult {
                success: false,
                input_path: path,
                output_path: None,
                error: Some(e),
                original_size: 0,
                new_size: 0,
            });
        results.push(result);
    }
    results
}
