use serde::Deserialize;
use std::path::Path;
use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::process::{CommandEvent, Output};
use tauri_plugin_shell::ShellExt;

use crate::types::{
    VideoCompressOptions, VideoConvertOptions, VideoInfo, VideoQualityMode, VideoResult,
};
use crate::utils::{resolve_output_dir, unique_output_path};

const PROGRESS_EVENT: &str = "video:progress";

#[derive(Debug, Clone, serde::Serialize)]
struct ProgressPayload {
    input_path: String,
    /// Fraction 0.0..=1.0
    progress: f64,
    /// Encoded media duration so far, in seconds.
    out_time_seconds: f64,
}

// ---- ffprobe JSON shapes (subset we care about) ----

#[derive(Debug, Deserialize)]
struct ProbeResult {
    streams: Vec<ProbeStream>,
    format: ProbeFormat,
}

#[derive(Debug, Deserialize)]
struct ProbeStream {
    codec_type: String,
    codec_name: Option<String>,
    width: Option<u32>,
    height: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct ProbeFormat {
    duration: Option<String>,
    bit_rate: Option<String>,
    format_name: Option<String>,
}

async fn run_ffprobe(app: &AppHandle, args: Vec<String>) -> Result<Output, String> {
    let shell = app.shell();
    let command = shell
        .sidecar("ffprobe")
        .map_err(|e| format!("Failed to locate ffprobe sidecar: {}", e))?
        .args(args);
    command
        .output()
        .await
        .map_err(|e| format!("ffprobe execution failed: {}", e))
}

async fn probe(app: &AppHandle, path: &str) -> Result<ProbeResult, String> {
    let output = run_ffprobe(
        app,
        vec![
            "-v".into(),
            "error".into(),
            "-print_format".into(),
            "json".into(),
            "-show_format".into(),
            "-show_streams".into(),
            path.into(),
        ],
    )
    .await?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ffprobe failed: {}", stderr));
    }

    let json = String::from_utf8_lossy(&output.stdout);
    serde_json::from_str::<ProbeResult>(&json)
        .map_err(|e| format!("Failed to parse ffprobe output: {}", e))
}

#[tauri::command]
pub async fn load_video_info(app: AppHandle, path: String) -> Result<VideoInfo, String> {
    let probe = probe(&app, &path).await?;

    let video_stream = probe
        .streams
        .iter()
        .find(|s| s.codec_type == "video")
        .ok_or_else(|| "No video stream found".to_string())?;
    let audio_stream = probe.streams.iter().find(|s| s.codec_type == "audio");

    let metadata = std::fs::metadata(&path).map_err(|e| e.to_string())?;
    let path_buf = Path::new(&path);
    let name = path_buf
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    let duration_seconds = probe
        .format
        .duration
        .as_ref()
        .and_then(|d| d.parse::<f64>().ok())
        .unwrap_or(0.0);
    let bitrate = probe
        .format
        .bit_rate
        .as_ref()
        .and_then(|b| b.parse::<u64>().ok());
    let format = probe.format.format_name.clone().unwrap_or_default();

    Ok(VideoInfo {
        path,
        name,
        size: metadata.len(),
        width: video_stream.width.unwrap_or(0),
        height: video_stream.height.unwrap_or(0),
        duration_seconds,
        format,
        video_codec: video_stream.codec_name.clone().unwrap_or_default(),
        audio_codec: audio_stream.and_then(|s| s.codec_name.clone()),
        bitrate,
        thumbnail: None,
    })
}

#[tauri::command]
pub async fn load_videos_batch(app: AppHandle, paths: Vec<String>) -> Vec<Result<VideoInfo, String>> {
    let mut results = Vec::with_capacity(paths.len());
    for path in paths {
        results.push(load_video_info(app.clone(), path).await);
    }
    results
}

/// Runs ffmpeg with progress emission to `video:progress` events.
/// Caller provides all ffmpeg args except `-progress -` and `-nostats`,
/// which are added here.
async fn run_ffmpeg_with_progress(
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

    let (mut rx, mut _child) = command
        .spawn()
        .map_err(|e| format!("ffmpeg spawn failed: {}", e))?;

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

    match exit_code {
        Some(0) => Ok(()),
        Some(code) => Err(format!("ffmpeg exited with code {}:\n{}", code, stderr_buf)),
        None => Err(format!("ffmpeg terminated without exit code:\n{}", stderr_buf)),
    }
}

fn extension_for_format(format: &str) -> String {
    format.to_lowercase()
}

fn default_video_codec_for(format: &str) -> &'static str {
    match format.to_lowercase().as_str() {
        "webm" => "libvpx-vp9",
        "mkv" | "mp4" | "mov" => "libx264",
        "avi" => "libx264",
        _ => "libx264",
    }
}

fn default_audio_codec_for(format: &str) -> &'static str {
    match format.to_lowercase().as_str() {
        "webm" => "libopus",
        _ => "aac",
    }
}

/// Codec-specific speed/threading flags. Different codecs accept very
/// different tunables (`-preset` for x264/x265, `-cpu-used`+`-row-mt`+
/// `-deadline` for VP9, none for stream-copy). `preset` is only honored
/// when the codec supports it.
fn codec_speed_args(codec: &str, preset: Option<&str>) -> Vec<String> {
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

#[tauri::command]
pub async fn convert_video(
    app: AppHandle,
    input_path: String,
    options: VideoConvertOptions,
) -> Result<VideoResult, String> {
    let input = Path::new(&input_path);
    let original_size = std::fs::metadata(&input_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let info = probe(&app, &input_path).await?;
    let duration_seconds = info
        .format
        .duration
        .as_ref()
        .and_then(|d| d.parse::<f64>().ok())
        .unwrap_or(0.0);

    let stem = input
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let output_dir = resolve_output_dir(&options.output_dir, input);
    let extension = extension_for_format(&options.format);
    let output_path = unique_output_path(&output_dir, stem, "converted", &extension);

    let video_codec = options
        .video_codec
        .clone()
        .unwrap_or_else(|| default_video_codec_for(&options.format).to_string());
    let audio_codec = options
        .audio_codec
        .clone()
        .unwrap_or_else(|| default_audio_codec_for(&options.format).to_string());

    let mut args: Vec<String> = vec![
        "-i".into(),
        input_path.clone(),
        "-c:v".into(),
        video_codec.clone(),
        "-c:a".into(),
        audio_codec,
    ];
    args.extend(codec_speed_args(&video_codec, None));
    if let Some(crf) = options.crf {
        args.push("-crf".into());
        args.push(crf.to_string());
    }
    args.push(output_path.to_string_lossy().to_string());

    run_ffmpeg_with_progress(&app, &input_path, duration_seconds, args).await?;

    let new_size = std::fs::metadata(&output_path).map(|m| m.len()).unwrap_or(0);

    Ok(VideoResult {
        success: true,
        input_path,
        output_path: Some(output_path.to_string_lossy().to_string()),
        error: None,
        original_size,
        new_size,
    })
}

#[tauri::command]
pub async fn convert_videos_batch(
    app: AppHandle,
    input_paths: Vec<String>,
    options: VideoConvertOptions,
) -> Vec<VideoResult> {
    let mut results = Vec::with_capacity(input_paths.len());
    for path in input_paths {
        let result = convert_video(app.clone(), path.clone(), options.clone())
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

#[tauri::command]
pub async fn compress_video(
    app: AppHandle,
    input_path: String,
    options: VideoCompressOptions,
) -> Result<VideoResult, String> {
    let input = Path::new(&input_path);
    let original_size = std::fs::metadata(&input_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let info = probe(&app, &input_path).await?;
    let duration_seconds = info
        .format
        .duration
        .as_ref()
        .and_then(|d| d.parse::<f64>().ok())
        .unwrap_or(0.0);

    let stem = input
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let output_dir = resolve_output_dir(&options.output_dir, input);
    let extension = extension_for_format(&options.format);
    let output_path = unique_output_path(&output_dir, stem, "compressed", &extension);

    let video_codec = default_video_codec_for(&options.format).to_string();
    let audio_codec = default_audio_codec_for(&options.format).to_string();
    let preset = options.preset.clone().unwrap_or_else(|| "medium".to_string());

    let mut args: Vec<String> = vec![
        "-i".into(),
        input_path.clone(),
        "-c:v".into(),
        video_codec.clone(),
        "-c:a".into(),
        audio_codec,
    ];
    args.extend(codec_speed_args(&video_codec, Some(&preset)));

    match options.mode {
        VideoQualityMode::Crf => {
            let crf = options.crf.unwrap_or(23);
            args.push("-crf".into());
            args.push(crf.to_string());
        }
        VideoQualityMode::Bitrate => {
            let bitrate = options.bitrate_kbps.unwrap_or(2000);
            args.push("-b:v".into());
            args.push(format!("{}k", bitrate));
        }
    }

    args.push(output_path.to_string_lossy().to_string());

    run_ffmpeg_with_progress(&app, &input_path, duration_seconds, args).await?;

    let new_size = std::fs::metadata(&output_path).map(|m| m.len()).unwrap_or(0);

    Ok(VideoResult {
        success: true,
        input_path,
        output_path: Some(output_path.to_string_lossy().to_string()),
        error: None,
        original_size,
        new_size,
    })
}

#[tauri::command]
pub async fn compress_videos_batch(
    app: AppHandle,
    input_paths: Vec<String>,
    options: VideoCompressOptions,
) -> Vec<VideoResult> {
    let mut results = Vec::with_capacity(input_paths.len());
    for path in input_paths {
        let result = compress_video(app.clone(), path.clone(), options.clone())
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

