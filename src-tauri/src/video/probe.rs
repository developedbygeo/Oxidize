use serde::Deserialize;
use std::path::Path;
use tauri::AppHandle;
use tauri_plugin_shell::process::Output;
use tauri_plugin_shell::ShellExt;

use crate::types::VideoInfo;

#[derive(Debug, Deserialize)]
pub(super) struct ProbeResult {
    pub(super) streams: Vec<ProbeStream>,
    pub(super) format: ProbeFormat,
}

#[derive(Debug, Deserialize)]
pub(super) struct ProbeStream {
    pub(super) codec_type: String,
    pub(super) codec_name: Option<String>,
    pub(super) width: Option<u32>,
    pub(super) height: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub(super) struct ProbeFormat {
    pub(super) duration: Option<String>,
    pub(super) bit_rate: Option<String>,
    pub(super) format_name: Option<String>,
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

pub(super) async fn probe(app: &AppHandle, path: &str) -> Result<ProbeResult, String> {
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
