mod desktop_files;
mod migrations;
mod network;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:wechat-md.db", migrations::all())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            network::fetch_wechat_html,
            network::fetch_remote_image,
            desktop_files::default_image_save_directory,
            desktop_files::save_article_images,
            desktop_files::open_image_directory
        ])
        .run(tauri::generate_context!())
        .expect("error while running WeChat MD");
}
