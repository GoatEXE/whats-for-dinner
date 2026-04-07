const path = require("node:path");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { createApp } = require("../../src/app");
const { createDatabase } = require("../../src/db/connection");
const { runMigrations } = require("../../src/db/migrate");

function createTestContext() {
  const tempDir = mkdtempSync(path.join(tmpdir(), "whats-for-dinner-"));
  const config = {
    nodeEnv: "test",
    port: 0,
    dbPath: path.join(tempDir, "test.sqlite"),
    seedOnEmpty: false,
    isTest: true,
  };
  const db = createDatabase(config);
  runMigrations(db);
  const app = createApp({ db, config });

  return {
    app,
    db,
    cleanup() {
      db.close();
      rmSync(tempDir, { recursive: true, force: true });
    },
  };
}

module.exports = {
  createTestContext,
};
