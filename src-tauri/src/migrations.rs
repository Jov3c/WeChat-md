use tauri_plugin_sql::{Migration, MigrationKind};

pub const V1_CREATE_STORES: &str = r#"
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
        "#;

pub const V2_INDEX_ASSET_LIBRARY: &str = r#"
  CREATE INDEX IF NOT EXISTS assets_unused_created
    ON assets(unused, created_at DESC);
"#;

pub const V3_CREATE_RECOVERY_STATE: &str = r#"
  CREATE TABLE IF NOT EXISTS recovery_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    article_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    style_id TEXT,
    layout_id TEXT,
    updated_at TEXT NOT NULL,
    saved_at TEXT
  );
"#;

pub fn all() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create workspace, asset and version stores",
            sql: V1_CREATE_STORES,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "index the asset library",
            sql: V2_INDEX_ASSET_LIBRARY,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create crash recovery state",
            sql: V3_CREATE_RECOVERY_STATE,
            kind: MigrationKind::Up,
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::{all, V1_CREATE_STORES, V2_INDEX_ASSET_LIBRARY, V3_CREATE_RECOVERY_STATE};
    use sha2::{Digest, Sha384};
    use sqlx::{Connection, Row, SqliteConnection};

    #[test]
    fn keeps_the_v1_checksum_compatible_with_existing_desktop_databases() {
        let checksum = Sha384::digest(V1_CREATE_STORES.as_bytes());
        let hexadecimal = checksum
            .iter()
            .map(|byte| format!("{byte:02X}"))
            .collect::<String>();

        assert_eq!(
            hexadecimal,
            "32C2005832BFACEB728BF7196FBB0E7595E87B708300F4C949F1763FA0A8DFB8B0071FD126FD1ED9DC88FDFFD50822FB",
        );
    }

    #[tokio::test]
    async fn upgrades_a_v1_database_without_losing_workspace_data() {
        let mut database = SqliteConnection::connect("sqlite::memory:")
            .await
            .expect("open in-memory SQLite database");

        sqlx::raw_sql(V1_CREATE_STORES)
            .execute(&mut database)
            .await
            .expect("apply v1 schema");
        sqlx::query("INSERT INTO workspace_state (id, payload, updated_at) VALUES (1, ?, ?)")
            .bind(r#"{"articles":[{"id":"article-1","title":"旧文章"}]}"#)
            .bind("2026-09-17T09:00:00.000Z")
            .execute(&mut database)
            .await
            .expect("save v1 workspace data");

        sqlx::raw_sql(V2_INDEX_ASSET_LIBRARY)
            .execute(&mut database)
            .await
            .expect("apply v2 migration");
        sqlx::raw_sql(V3_CREATE_RECOVERY_STATE)
            .execute(&mut database)
            .await
            .expect("apply v3 migration");

        let workspace = sqlx::query("SELECT payload FROM workspace_state WHERE id = 1")
            .fetch_one(&mut database)
            .await
            .expect("load preserved workspace");
        let payload: String = workspace.get("payload");
        assert!(payload.contains("旧文章"));

        let index = sqlx::query(
            "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'assets_unused_created'",
        )
        .fetch_one(&mut database)
        .await
        .expect("find v2 asset index");
        assert_eq!(index.get::<String, _>("name"), "assets_unused_created");

        let recovery_table = sqlx::query(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'recovery_state'",
        )
        .fetch_one(&mut database)
        .await
        .expect("find v3 recovery table");
        assert_eq!(recovery_table.get::<String, _>("name"), "recovery_state");

        let versions = all()
            .into_iter()
            .map(|migration| migration.version)
            .collect::<Vec<_>>();
        assert_eq!(versions, vec![1, 2, 3]);
    }
}
