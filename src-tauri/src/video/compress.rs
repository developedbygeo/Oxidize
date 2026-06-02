use std::path::Path;
use tauri::AppHandle;

use crate::types::{VideoCompressOptions, VideoQualityMode, VideoResult};
use crate::utils::{resolve_output_dir, unique_output_path};

use super::ffmpeg::{
    codec_speed_args, default_audio_codec_for, default_video_codec_for, extension_for_format,
    run_ffmpeg_with_progress, run_video_batch,
};
use super::probe::probe;

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
    run_video_batch(app, input_paths, options, compress_video).await
}
