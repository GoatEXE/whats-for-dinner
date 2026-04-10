import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";

import { initialMigration } from "./migrations/001-initial";

const DATABASE_NAME = "whats-for-dinner.db";
const migrations = [initialMigration];

let databaseInstance: SQLiteDatabase | null = null;
let isInitialized = false;

function applyConnectionPragmas(database: SQLiteDatabase) {
  database.execSync(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
  `);
}

function runMigrations(database: SQLiteDatabase) {
  database.withTransactionSync(() => {
    const versionRow = database.getFirstSync<{ user_version: number }>(
      "PRAGMA user_version",
    );
    let currentVersion = versionRow?.user_version ?? 0;

    for (const migration of migrations) {
      if (migration.version <= currentVersion) {
        continue;
      }

      database.execSync(migration.sql);
      currentVersion = migration.version;
    }

    database.execSync(`PRAGMA user_version = ${currentVersion}`);
  });
}

export function initializeDatabase() {
  if (!databaseInstance) {
    databaseInstance = openDatabaseSync(DATABASE_NAME);
    applyConnectionPragmas(databaseInstance);
  }

  if (!isInitialized) {
    runMigrations(databaseInstance);
    isInitialized = true;
  }

  return databaseInstance;
}

export function getDatabase() {
  return initializeDatabase();
}
