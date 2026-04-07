const path = require("node:path");
const { readdirSync } = require("node:fs");
const { createDatabase } = require("./connection");
const { loadConfig } = require("../config/env");

const migrationsDir = path.resolve(__dirname, "migrations");

function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const applied = new Set(
    db
      .prepare("SELECT filename FROM schema_migrations ORDER BY filename")
      .all()
      .map((row) => row.filename),
  );

  const filenames = readdirSync(migrationsDir)
    .filter((filename) => filename.endsWith(".sql"))
    .sort();

  const insertMigration = db.prepare(
    "INSERT INTO schema_migrations (filename) VALUES (?)",
  );

  for (const filename of filenames) {
    if (applied.has(filename)) {
      continue;
    }

    const sql = require("node:fs").readFileSync(
      path.join(migrationsDir, filename),
      "utf8",
    );

    const transaction = db.transaction(() => {
      db.exec(sql);
      insertMigration.run(filename);
    });

    transaction();
  }
}

if (require.main === module) {
  const config = loadConfig();
  const db = createDatabase(config);

  runMigrations(db);
  db.close();
  console.log(`Applied migrations against ${config.dbPath}`);
}

module.exports = {
  runMigrations,
};
