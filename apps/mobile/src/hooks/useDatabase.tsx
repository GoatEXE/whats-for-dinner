import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { initializeDatabase } from "../db/database";
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
    try {
      setDb(initializeDatabase());
      setIsReady(true);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError : new Error(String(caughtError)));
      setIsReady(false);
    }
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
