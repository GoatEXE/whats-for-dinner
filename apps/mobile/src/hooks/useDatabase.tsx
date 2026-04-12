import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { initializeDatabase } from "../db/database";
import { isDatabaseEmpty } from "../db/is-empty";
import { seedSampleData } from "../db/seed";
import type { DatabaseHandle } from "../db/types";

interface DatabaseContextValue {
  db: DatabaseHandle | null;
  isReady: boolean;
  error: Error | null;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

export function DatabaseProvider({ children }: PropsWithChildren) {
  const [db, setDb] = useState<DatabaseHandle | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const database = await initializeDatabase();
        if (cancelled) return;

        // Auto-seed sample data on first launch so the app is demo-ready.
        if (isDatabaseEmpty(database)) {
          try {
            seedSampleData(database);
          } catch (seedError) {
            // Seeding is best-effort. Log but do not block app startup.
            // eslint-disable-next-line no-console
            console.warn("Sample data seed failed:", seedError);
          }
        }

        setDb(database);
        setIsReady(true);
      } catch (caughtError) {
        if (cancelled) return;
        setError(
          caughtError instanceof Error
            ? caughtError
            : new Error(String(caughtError)),
        );
        setIsReady(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      db,
      isReady,
      error,
    }),
    [db, error, isReady],
  );

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
}

export function useDatabase() {
  const value = useContext(DatabaseContext);

  if (!value) {
    throw new Error("useDatabase must be used within a DatabaseProvider");
  }

  return value;
}
