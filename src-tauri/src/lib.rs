mod beautify;
mod commands;
mod compress;
mod convert;
mod effects;
mod loader;
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
            // Pipeline
            pipeline::process_pipeline_batch,
            // Video
            video::load_video_info,
            video::load_videos_batch,
            video::convert_video,
            video::convert_videos_batch,
            video::compress_video,
            video::compress_videos_batch,
            video::resize_video,
            video::resize_videos_batch,
            video::extract_audio,
            video::extract_audio_batch,
            video::cancel_video_jobs,
            // Commands
            commands::open_folder,
            commands::reveal_file,
            commands::delete_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
