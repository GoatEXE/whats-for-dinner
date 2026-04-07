const Database = require("better-sqlite3");

function createDatabase(config) {
  const db = new Database(config.dbPath);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("synchronous = NORMAL");

  return db;
}

module.exports = {
  createDatabase,
};
