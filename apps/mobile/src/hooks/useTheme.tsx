import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { useColorScheme } from 'react-native';

import {
  type ThemePreference,
  type ColorScheme,
  type ColorPalette,
  resolveColorScheme,
  getColorsForScheme,
  isValidThemePreference,
} from '../ui/theme';

// ---------------------------------------------------------------------------
// Persistence via expo-sqlite/kv-store (separate DB from meal data)
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'theme_preference';

/** Lazy-load the KV store so the import doesn't break in non-Expo test envs. */
function getStorage() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Storage } = require('expo-sqlite/kv-store') as typeof import('expo-sqlite/kv-store');
  return Storage;
}

function readPreferenceSync(): ThemePreference {
  try {
    const raw = getStorage().getItemSync(STORAGE_KEY);
    return isValidThemePreference(raw) ? raw : 'system';
  } catch {
    return 'system';
  }
}

async function writePreference(pref: ThemePreference): Promise<void> {
  try {
    await getStorage().setItemAsync(STORAGE_KEY, pref);
  } catch {
    // Best-effort — don't crash if storage fails.
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
interface ThemeContextValue {
  preference: ThemePreference;
  scheme: ColorScheme;
  colors: ColorPalette;
  setPreference: (next: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const deviceScheme = useColorScheme() as ColorScheme | null;
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    readPreferenceSync(),
  );

  const scheme = resolveColorScheme(preference, deviceScheme);
  const colors = getColorsForScheme(scheme);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    writePreference(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, scheme, colors, setPreference }),
    [preference, scheme, colors, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Access the full theme context. Throws if used outside ThemeProvider. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}

/** Convenience: just the active color palette. */
export function useColors(): ColorPalette {
  return useTheme().colors;
}

/** Convenience: the resolved "light" | "dark" scheme. */
export function useColorSchemeResolved(): ColorScheme {
  return useTheme().scheme;
}
