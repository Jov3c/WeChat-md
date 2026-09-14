use tauri_plugin_sql::{Migration, MigrationKind};

mod network;
mod desktop_files;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "create workspace, asset and version stores",
        sql: r#"
          CREATE TABLE IF NOT EXISTS workspace_state (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            payload TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS assets (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            mime_type TEXT NOT NULL,
            size INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            source TEXT NOT NULL,
            source_url TEXT,
            unused INTEGER NOT NULL,
            blob BLOB NOT NULL
          );
          CREATE TABLE IF NOT EXISTS versions (
            id TEXT PRIMARY KEY,
            article_id TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            style_id TEXT,
            style_snapshot TEXT,
            created_at TEXT NOT NULL,
            reason TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS versions_article_created
            ON versions(article_id, created_at DESC);
        "#,
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:wechat-md.db", migrations)
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
