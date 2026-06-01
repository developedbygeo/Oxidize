use std::path::Path;
use tauri::AppHandle;

use crate::types::{VideoResult, VideoWatermarkOptions, WatermarkPosition};
use crate::utils::{resolve_output_dir, unique_output_path};

use super::ffmpeg::{
    codec_speed_args, default_audio_codec_for, default_video_codec_for, extension_for_format,
    run_ffmpeg_with_progress, run_video_batch,
};
use super::probe::probe;

/// Translate a 9-cell anchor + a pixel margin into the `x:y` half of an
/// ffmpeg `overlay=` expression. `W`/`H` reference the main video's
/// dimensions; `w`/`h` reference the (already-scaled) watermark — ffmpeg
/// resolves these at filter time so we don't need the actual watermark size.
pub fn overlay_xy(position: WatermarkPosition, margin: u32) -> String {
    use WatermarkPosition::*;
    let m = margin;
    let cx = "(W-w)/2";
    let cy = "(H-h)/2";
    let right_x = format!("W-w-{}", m);
    let bottom_y = format!("H-h-{}", m);
    match position {
        TopLeft => format!("{}:{}", m, m),
        TopCenter => format!("{}:{}", cx, m),
        TopRight => format!("{}:{}", right_x, m),
        MiddleLeft => format!("{}:{}", m, cy),
        MiddleCenter => format!("{}:{}", cx, cy),
        MiddleRight => format!("{}:{}", right_x, cy),
        BottomLeft => format!("{}:{}", m, bottom_y),
        BottomCenter => format!("{}:{}", cx, bottom_y),
        BottomRight => format!("{}:{}", right_x, bottom_y),
    }
}

/// Build the full `-filter_complex` value for an ffmpeg watermark overlay.
///
/// Pipeline (input `[0]` = video, `[1]` = watermark image):
/// 1. Scale the watermark to the requested width with auto-derived height
///    (`scale={target_w}:-1`). `-1` keeps the watermark's aspect — the
///    overlay filter doesn't care about parity, only the encoder does.
/// 2. Convert to RGBA so `colorchannelmixer` can multiply the alpha channel.
/// 3. Multiply alpha by `opacity` (`aa=` is the per-pixel alpha-out coefficient).
/// 4. Overlay the result onto the base video at the chosen anchor.
///
/// The locale-independent `{:.4}` opacity formatting avoids comma-decimal
/// surprises on non-English systems where `format!("{}", 0.5)` could differ.
pub fn build_overlay_filter(
    base_width: u32,
    position: WatermarkPosition,
    opacity: f32,
    scale_percent: f32,
    margin_percent: f32,
) -> String {
    let opacity = opacity.clamp(0.0, 1.0);
    let scale_pct = scale_percent.clamp(0.0, 100.0);
    let margin_pct = margin_percent.clamp(0.0, 100.0);

    let target_w = ((base_width as f32 * scale_pct / 100.0).round() as u32).max(1);
    let margin_px = (base_width as f32 * margin_pct / 100.0).round() as u32;

    let xy = overlay_xy(position, margin_px);

    format!(
        "[1:v]scale={}:-1,format=rgba,colorchannelmixer=aa={:.4}[wm];[0:v][wm]overlay={}",
        target_w, opacity, xy
    )
}

async fn run_watermark_video(
    app: AppHandle,
    input_path: String,
    options: VideoWatermarkOptions,
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
    // Watermark scale is relative to the source video's width — pull it
    // from the first video stream the probe found.
    let base_width = info
        .streams
        .iter()
        .find(|s| s.codec_type == "video")
        .and_then(|s| s.width)
        .ok_or_else(|| "Could not determine source video width".to_string())?;

    let stem = input
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let output_dir = resolve_output_dir(&options.output_dir, input);
    let extension = extension_for_format(&options.format);
    let output_path = unique_output_path(&output_dir, stem, "watermarked", &extension);

    let video_codec = default_video_codec_for(&options.format).to_string();
    let audio_codec = default_audio_codec_for(&options.format).to_string();
    let filter = build_overlay_filter(
        base_width,
        options.position,
        options.opacity,
        options.scale_percent,
        options.margin_percent,
    );
    let crf = options.crf.unwrap_or(23);

    // `-map "[v]"` would only ship the video stream; we set the filter's
    // final pad to no label so it's the default and use `-map 0:a?` to
    // optionally carry audio through. The `?` keeps things working for
    // silent sources.
    let mut args: Vec<String> = vec![
        "-i".into(),
        input_path.clone(),
        "-i".into(),
        options.watermark_path.clone(),
        "-filter_complex".into(),
        filter,
        "-map".into(),
        "0:a?".into(),
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
pub async fn watermark_video(
    app: AppHandle,
    input_path: String,
    options: VideoWatermarkOptions,
) -> Result<VideoResult, String> {
    run_watermark_video(app, input_path, options).await
}

#[tauri::command]
pub async fn watermark_videos_batch(
    app: AppHandle,
    input_paths: Vec<String>,
    options: VideoWatermarkOptions,
) -> Vec<VideoResult> {
    run_video_batch(app, input_paths, options, run_watermark_video).await
}

#[cfg(test)]
mod tests {
    use super::*;

    // ──────────────── overlay_xy ────────────────

    #[test]
    fn top_left_uses_margin_for_both_axes() {
        assert_eq!(overlay_xy(WatermarkPosition::TopLeft, 10), "10:10");
    }

    #[test]
    fn bottom_right_uses_ffmpeg_expressions_for_both_axes() {
        assert_eq!(
            overlay_xy(WatermarkPosition::BottomRight, 10),
            "W-w-10:H-h-10"
        );
    }

    #[test]
    fn middle_center_uses_centring_expressions_and_drops_margin() {
        // No margin pixels should appear — centring overrides the offset.
        assert_eq!(
            overlay_xy(WatermarkPosition::MiddleCenter, 50),
            "(W-w)/2:(H-h)/2"
        );
    }

    #[test]
    fn top_right_anchors_x_to_right_y_to_top() {
        assert_eq!(overlay_xy(WatermarkPosition::TopRight, 5), "W-w-5:5");
    }

    #[test]
    fn bottom_left_anchors_x_to_left_y_to_bottom() {
        assert_eq!(overlay_xy(WatermarkPosition::BottomLeft, 5), "5:H-h-5");
    }

    #[test]
    fn middle_left_uses_left_margin_and_y_centred() {
        assert_eq!(overlay_xy(WatermarkPosition::MiddleLeft, 7), "7:(H-h)/2");
    }

    #[test]
    fn top_center_uses_x_centred_and_top_margin() {
        assert_eq!(overlay_xy(WatermarkPosition::TopCenter, 7), "(W-w)/2:7");
    }

    // ──────────────── build_overlay_filter ────────────────

    #[test]
    fn filter_scales_watermark_to_percent_of_base_width() {
        // 1920px wide source, 20% scale → 384px watermark.
        let filter = build_overlay_filter(1920, WatermarkPosition::BottomRight, 1.0, 20.0, 0.0);
        assert!(filter.starts_with("[1:v]scale=384:-1,"));
    }

    #[test]
    fn filter_target_width_is_at_least_one_pixel() {
        // Tiny base + tiny scale would round to zero — clamp guarantees a
        // visible watermark rather than a degenerate scale filter.
        let filter = build_overlay_filter(10, WatermarkPosition::TopLeft, 1.0, 1.0, 0.0);
        assert!(filter.contains("scale=1:-1,"), "filter was: {}", filter);
    }

    #[test]
    fn filter_emits_opacity_as_decimal_to_four_places() {
        // Round-number opacities format as e.g. "1.0000", "0.5000". This is
        // intentional — ffmpeg's `aa=` accepts decimal floats, and a fixed
        // precision sidesteps locale-decimal issues on non-en systems.
        let filter = build_overlay_filter(100, WatermarkPosition::TopLeft, 0.5, 10.0, 0.0);
        assert!(filter.contains("aa=0.5000"), "filter was: {}", filter);
    }

    #[test]
    fn filter_clamps_opacity_above_one_to_one() {
        // We accept f32s but a UI bug shouldn't fall through to ffmpeg.
        let filter = build_overlay_filter(100, WatermarkPosition::TopLeft, 1.5, 10.0, 0.0);
        assert!(filter.contains("aa=1.0000"), "filter was: {}", filter);
    }

    #[test]
    fn filter_clamps_negative_opacity_to_zero() {
        let filter = build_overlay_filter(100, WatermarkPosition::TopLeft, -1.0, 10.0, 0.0);
        assert!(filter.contains("aa=0.0000"), "filter was: {}", filter);
    }

    #[test]
    fn filter_uses_margin_as_pixel_offset_relative_to_base_width() {
        // 1000px wide source, margin 5% → 50px.
        let filter = build_overlay_filter(1000, WatermarkPosition::BottomRight, 1.0, 10.0, 5.0);
        assert!(
            filter.ends_with("overlay=W-w-50:H-h-50"),
            "filter was: {}",
            filter
        );
    }

    #[test]
    fn filter_pipes_video_then_watermark_via_intermediate_label() {
        let filter = build_overlay_filter(1920, WatermarkPosition::TopLeft, 1.0, 20.0, 2.0);
        // [1:v] scaled → [wm], composed onto [0:v] without a final label
        // (we let it pass through as the implicit default output).
        assert!(filter.contains("[wm];[0:v][wm]overlay="));
    }
}
