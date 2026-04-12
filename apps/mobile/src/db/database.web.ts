/**
 * Web-specific database backend.
 *
 * The default `expo-sqlite` web backend (wa-sqlite) needs SharedArrayBuffer,
 * which only works when the page is cross-origin isolated. That is hard to
 * arrange reliably from a Metro dev server, so for web we side-step the
 * problem entirely and use `sql.js` (pure WASM SQLite) loaded from a public
 * CDN. sql.js does not need SharedArrayBuffer and runs in any modern
 * browser.
 *
 * Trade-offs:
 * - Data is kept in memory and lost on page refresh. That is acceptable for
 *   the demo flow because `seedSampleData` auto-runs on empty, so every
 *   reload gives a freshly seeded dataset.
 * - First page load waits for the sql.js WASM module to download (~1 MB).
 *   A loading spinner ("Loading your kitchen…") is already rendered by
 *   DatabaseGate while this happens.
 */
import { initialMigration } from "./migrations/001-initial";
import type { DatabaseHandle } from "./types";

const SQL_JS_VERSION = "1.10.3";
const SQL_JS_CDN = `https://cdn.jsdelivr.net/npm/sql.js@${SQL_JS_VERSION}/dist`;

// Minimal typings for the subset of sql.js we use. We avoid pulling in the
// `@types/sql.js` package so no extra install is required.
interface SqlJsStatic {
  Database: new () => SqlJsDatabase;
}

interface SqlJsDatabase {
  run(sql: string, params?: readonly unknown[]): void;
  exec(sql: string): unknown;
  prepare(sql: string): SqlJsStatement;
  getRowsModified(): number;
}

interface SqlJsStatement {
  bind(params: readonly unknown[]): boolean;
  step(): boolean;
  getAsObject(): Record<string, unknown>;
  free(): void;
}

type InitSqlJs = (opts: {
  locateFile: (file: string) => string;
}) => Promise<SqlJsStatic>;

declare global {
  interface Window {
    initSqlJs?: InitSqlJs;
  }
}

let databasePromise: Promise<DatabaseHandle> | null = null;

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[data-sqljs="${SQL_JS_VERSION}"]`,
    );
    if (existing) {
      if ((existing as HTMLScriptElement).dataset.loaded === "true") {
        resolve();
      } else {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () =>
          reject(new Error(`Failed to load ${src}`)),
        );
      }
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.sqljs = SQL_JS_VERSION;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    });
    script.addEventListener("error", () =>
      reject(new Error(`Failed to load ${src}`)),
    );
    document.head.appendChild(script);
  });
}

async function loadSqlJs(): Promise<SqlJsStatic> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("sql.js web backend requires a browser environment");
  }

  if (!window.initSqlJs) {
    await loadScriptOnce(`${SQL_JS_CDN}/sql-wasm.js`);
  }

  const init = window.initSqlJs;
  if (!init) {
    throw new Error("initSqlJs is not available after loading sql.js");
  }

  return init({
    locateFile: (file: string) => `${SQL_JS_CDN}/${file}`,
  });
}

function normalizeParams(params: unknown[]): unknown[] {
  if (params.length === 1 && Array.isArray(params[0])) {
    return params[0] as unknown[];
  }
  return params;
}

function createHandle(db: SqlJsDatabase): DatabaseHandle {
  return {
    getFirstSync<T>(sql: string, ...params: unknown[]): T | null {
      const stmt = db.prepare(sql);
      try {
        stmt.bind(normalizeParams(params));
        if (stmt.step()) {
          return stmt.getAsObject() as T;
        }
        return null;
      } finally {
        stmt.free();
      }
    },

    getAllSync<T>(sql: string, ...params: unknown[]): T[] {
      const stmt = db.prepare(sql);
      try {
        stmt.bind(normalizeParams(params));
        const rows: T[] = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject() as T);
        }
        return rows;
      } finally {
        stmt.free();
      }
    },

    runSync(sql: string, ...params: unknown[]): { changes: number } {
      db.run(sql, normalizeParams(params));
      return { changes: db.getRowsModified() };
    },

    execSync(sql: string): void {
      db.exec(sql);
    },

    withTransactionSync<T>(callback: () => T): T {
      db.exec("BEGIN TRANSACTION");
      try {
        const result = callback();
        db.exec("COMMIT");
        return result;
      } catch (error) {
        try {
          db.exec("ROLLBACK");
        } catch {
          // ignore rollback failure; original error is more informative
        }
        throw error;
      }
    },
  };
}

export async function initializeDatabase(): Promise<DatabaseHandle> {
  if (!databasePromise) {
    databasePromise = (async () => {
      const SQL = await loadSqlJs();
      const rawDb = new SQL.Database();
      const handle = createHandle(rawDb);

      // Connection pragmas and migrations mirror the native path.
      handle.execSync("PRAGMA foreign_keys = ON;");
      handle.withTransactionSync(() => {
        handle.execSync(initialMigration.sql);
      });

      return handle;
    })();
  }
  return databasePromise;
}

export async function getDatabase(): Promise<DatabaseHandle> {
  return initializeDatabase();
}
