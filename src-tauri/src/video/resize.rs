use std::path::Path;
use tauri::AppHandle;

use crate::types::{VideoResizeMode, VideoResizeOptions, VideoResult};
use crate::utils::{resolve_output_dir, unique_output_path};

use super::ffmpeg::{
    codec_speed_args, default_audio_codec_for, default_video_codec_for, extension_for_format,
    run_ffmpeg_with_progress, run_video_batch,
};
use super::probe::probe;

/// Builds the `-vf scale=…` filter argument for the requested resize options.
/// Uses `-2` (auto, divisible by 2) to maintain aspect ratio — many codecs
/// reject odd dimensions, so we always snap to even.
fn build_scale_filter(options: &VideoResizeOptions) -> Result<String, String> {
    match options.mode {
        VideoResizeMode::PresetHeight => {
            let h = options
                .target_height
                .ok_or_else(|| "Preset resize requires target_height".to_string())?;
            Ok(format!("scale=-2:{}", h))
        }
        VideoResizeMode::Custom => {
            let maintain = options.maintain_aspect.unwrap_or(true);
            if maintain {
                if let Some(h) = options.height {
                    return Ok(format!("scale=-2:{}", h));
                }
                if let Some(w) = options.width {
                    return Ok(format!("scale={}:-2", w));
                }
                Err("Custom resize requires width or height".into())
            } else {
                let w = options
                    .width
                    .ok_or_else(|| "Custom resize requires width when aspect not maintained".to_string())?;
                let h = options
                    .height
                    .ok_or_else(|| "Custom resize requires height when aspect not maintained".to_string())?;
                Ok(format!("scale={}:{}", w, h))
            }
        }
    }
}

#[tauri::command]
pub async fn resize_video(
    app: AppHandle,
    input_path: String,
    options: VideoResizeOptions,
) -> Result<VideoResult, String> {
    let input = Path::new(&input_path);
    let original_size = std::fs::metadata(&input_path).map(|m| m.len()).unwrap_or(0);

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
    let output_path = unique_output_path(&output_dir, stem, "resized", &extension);

    let video_codec = default_video_codec_for(&options.format).to_string();
    let audio_codec = default_audio_codec_for(&options.format).to_string();
    let scale_filter = build_scale_filter(&options)?;
    let crf = options.crf.unwrap_or(23);

    let mut args: Vec<String> = vec![
        "-i".into(),
        input_path.clone(),
        "-vf".into(),
        scale_filter,
        "-c:v".into(),
        video_codec.clone(),
        "-c:a".into(),
        audio_codec,
    ];
    args.extend(codec_speed_args(&video_codec, None));
    args.push("-crf".into());
    args.push(crf.to_string());
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
pub async fn resize_videos_batch(
    app: AppHandle,
    input_paths: Vec<String>,
    options: VideoResizeOptions,
) -> Vec<VideoResult> {
    run_video_batch(app, input_paths, options, resize_video).await
}
