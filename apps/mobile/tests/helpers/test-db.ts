import Database from "better-sqlite3";

import { initialMigration } from "@/db/migrations/001-initial";
import type { DatabaseHandle } from "@/db/types";

type BetterSqliteDatabase = Database.Database;

export interface TestDatabaseContext {
  db: DatabaseHandle;
  rawDb: BetterSqliteDatabase;
  close: () => void;
}

function normalizeParams(params: unknown[]) {
  if (params.length === 1 && Array.isArray(params[0])) {
    return params[0] as unknown[];
  }

  return params;
}

function adaptDatabase(rawDb: BetterSqliteDatabase): DatabaseHandle {
  return {
    getFirstSync<T>(sql: string, ...params: unknown[]) {
      return (rawDb.prepare(sql).get(...normalizeParams(params)) as T | undefined) ?? null;
    },
    getAllSync<T>(sql: string, ...params: unknown[]) {
      return rawDb.prepare(sql).all(...normalizeParams(params)) as T[];
    },
    runSync(sql: string, ...params: unknown[]) {
      const result = rawDb.prepare(sql).run(...normalizeParams(params));
      return { changes: result.changes };
    },
    withTransactionSync<T>(callback: () => T) {
      if (rawDb.inTransaction) {
        return callback();
      }

      return rawDb.transaction(() => callback())();
    },
    execSync(sql: string) {
      rawDb.exec(sql);
    },
  } as DatabaseHandle;
}

export function createTestDb(): TestDatabaseContext {
  const rawDb = new Database(":memory:");

  rawDb.pragma("foreign_keys = ON");
  rawDb.pragma("journal_mode = MEMORY");
  rawDb.exec(initialMigration.sql);
  rawDb.pragma(`user_version = ${initialMigration.version}`);

  return {
    db: adaptDatabase(rawDb),
    rawDb,
    close() {
      rawDb.close();
    },
  };
}
