use std::path::Path;
use tauri::AppHandle;

use crate::types::{VideoResult, VideoTrimMode, VideoTrimOptions};
use crate::utils::{resolve_output_dir, unique_output_path};

use super::ffmpeg::{
    codec_speed_args, default_audio_codec_for, default_video_codec_for, run_ffmpeg_with_progress,
};

#[tauri::command]
pub async fn trim_video(
    app: AppHandle,
    input_path: String,
    options: VideoTrimOptions,
) -> Result<VideoResult, String> {
    let input = Path::new(&input_path);
    let original_size = std::fs::metadata(&input_path).map(|m| m.len()).unwrap_or(0);

    if options.end_seconds <= options.start_seconds {
        return Err("End time must be greater than start time".into());
    }

    let duration_seconds = (options.end_seconds - options.start_seconds).max(0.0);

    let stem = input
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let extension = input
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("mp4")
        .to_lowercase();
    let output_dir = resolve_output_dir(&options.output_dir, input);
    let output_path = unique_output_path(&output_dir, stem, "trimmed", &extension);

    // Two distinct invocation shapes:
    //   Fast    : `-ss start -to end -i input -c copy output`  (input seek, no re-encode)
    //   Accurate: `-i input -ss start -to end -c:v X -c:a Y -crf N output` (output seek, re-encode)
    let args: Vec<String> = match options.mode {
        VideoTrimMode::Fast => vec![
            "-ss".into(),
            options.start_seconds.to_string(),
            "-to".into(),
            options.end_seconds.to_string(),
            "-i".into(),
            input_path.clone(),
            "-c".into(),
            "copy".into(),
            // Avoid negative timestamps after the seek, which some players reject.
            "-avoid_negative_ts".into(),
            "make_zero".into(),
            output_path.to_string_lossy().to_string(),
        ],
        VideoTrimMode::Accurate => {
            let video_codec = default_video_codec_for(&extension).to_string();
            let audio_codec = default_audio_codec_for(&extension).to_string();
            let crf = options.crf.unwrap_or(23);
            let mut a: Vec<String> = vec![
                "-i".into(),
                input_path.clone(),
                "-ss".into(),
                options.start_seconds.to_string(),
                "-to".into(),
                options.end_seconds.to_string(),
                "-c:v".into(),
                video_codec.clone(),
                "-c:a".into(),
                audio_codec,
            ];
            a.extend(codec_speed_args(&video_codec, None));
            a.push("-crf".into());
            a.push(crf.to_string());
            a.push(output_path.to_string_lossy().to_string());
            a
        }
    };

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
