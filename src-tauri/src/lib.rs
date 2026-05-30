mod beautify;
mod clipboard_temp;
mod commands;
mod compress;
mod convert;
mod crop;
mod effects;
mod image_jobs;
mod loader;
mod metadata;
mod pipeline;
mod types;
mod utils;
mod video;

pub use types::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(video::VideoJobs::default())
        .manage(image_jobs::ImageJobs::default())
        .setup(|app| {
            // One-shot: nuke any clipboard-paste blobs left over from a
            // previous session. Best-effort; failures swallowed inside.
            clipboard_temp::sweep_on_startup(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Loader
            loader::load_image_info,
            loader::load_images_batch,
            loader::get_image_preview,
            loader::get_supported_formats,
            loader::check_path_exists,
            // Convert
            convert::convert_image,
            convert::convert_images_batch,
            // Compress
            compress::compress_image,
            compress::compress_images_batch,
            // Beautify
            beautify::beautify_image,
            beautify::beautify_images_batch,
            // Effects
            effects::apply_image_effect,
            effects::apply_image_effects_batch,
            // Crop
            crop::crop_image,
            crop::crop_images_batch,
            // Pipeline
            pipeline::process_pipeline_batch,
            // Video
            video::probe::load_video_info,
            video::probe::load_videos_batch,
            video::convert::convert_video,
            video::convert::convert_videos_batch,
            video::compress::compress_video,
            video::compress::compress_videos_batch,
            video::resize::resize_video,
            video::resize::resize_videos_batch,
            video::audio::extract_audio,
            video::audio::extract_audio_batch,
            video::trim::trim_video,
            video::jobs::cancel_video_jobs,
            // Image batch control
            image_jobs::cancel_image_jobs,
            // Commands
            commands::open_folder,
            commands::reveal_file,
            commands::delete_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
