use std::path::Path;
use tauri::AppHandle;

use crate::types::{AudioExtractOptions, VideoResult};
use crate::utils::{resolve_output_dir, unique_output_path};

use super::ffmpeg::{run_ffmpeg_with_progress, run_video_batch};
use super::probe::probe;

/// Maps an audio container/format to the ffmpeg encoder name.
fn audio_codec_for(format: &str) -> &'static str {
    match format.to_lowercase().as_str() {
        "mp3" => "libmp3lame",
        "aac" | "m4a" => "aac",
        "opus" => "libopus",
        "ogg" => "libvorbis",
        "flac" => "flac",
        "wav" => "pcm_s16le",
        _ => "aac",
    }
}

fn audio_format_is_lossless(format: &str) -> bool {
    matches!(format.to_lowercase().as_str(), "flac" | "wav")
}

#[tauri::command]
pub async fn extract_audio(
    app: AppHandle,
    input_path: String,
    options: AudioExtractOptions,
) -> Result<VideoResult, String> {
    let input = Path::new(&input_path);
    let original_size = std::fs::metadata(&input_path).map(|m| m.len()).unwrap_or(0);

    let info = probe(&app, &input_path).await?;
    let has_audio = info.streams.iter().any(|s| s.codec_type == "audio");
    if !has_audio {
        return Err("Source has no audio stream".into());
    }
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
    let extension = options.format.to_lowercase();
    let output_path = unique_output_path(&output_dir, stem, "audio", &extension);

    let codec = audio_codec_for(&options.format);
    let mut args: Vec<String> = vec![
        "-i".into(),
        input_path.clone(),
        "-vn".into(), // strip the video stream
        "-c:a".into(),
        codec.into(),
    ];

    // Lossy formats accept a target bitrate; lossless ignore it.
    if !audio_format_is_lossless(&options.format) {
        if let Some(kbps) = options.bitrate_kbps {
            args.push("-b:a".into());
            args.push(format!("{}k", kbps));
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
pub async fn extract_audio_batch(
    app: AppHandle,
    input_paths: Vec<String>,
    options: AudioExtractOptions,
) -> Vec<VideoResult> {
    run_video_batch(app, input_paths, options, extract_audio).await
}
