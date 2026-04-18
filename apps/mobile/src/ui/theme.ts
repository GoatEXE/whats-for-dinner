/** Centralized color tokens and sizing constants */

/** The three user-selectable appearance modes. */
export type ThemePreference = 'system' | 'light' | 'dark';

/** Resolved scheme after evaluating system preference. */
export type ColorScheme = 'light' | 'dark';

export interface ColorPalette {
  accent: string;
  accentLight: string;
  accentDark: string;
  background: string;
  surface: string;
  surfaceBorder: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  successLight: string;
  warning: string;
  danger: string;
  dangerLight: string;
  error: string;
  white: string;
  overlay: string;
  star: string;
}

export const lightColors: ColorPalette = {
  accent: '#F97316',
  accentLight: '#FFF7ED',
  accentDark: '#EA580C',
  background: '#FFFFFF',
  surface: '#F8F9FA',
  surfaceBorder: '#E5E7EB',
  text: '#1F2937',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  success: '#10B981',
  successLight: '#ECFDF5',
  warning: '#F59E0B',
  danger: '#EF4444',
  dangerLight: '#FEF2F2',
  error: '#EF4444',
  white: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.4)',
  star: '#FBBF24',
} as const;

export const darkColors: ColorPalette = {
  accent: '#FB923C',
  accentLight: '#431407',
  accentDark: '#FDBA74',
  background: '#111827',
  surface: '#1F2937',
  surfaceBorder: '#374151',
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textMuted: '#6B7280',
  success: '#34D399',
  successLight: '#064E3B',
  warning: '#FBBF24',
  danger: '#F87171',
  dangerLight: '#450A0A',
  error: '#F87171',
  white: '#1F2937',
  overlay: 'rgba(0,0,0,0.6)',
  star: '#FBBF24',
} as const;

/**
 * Backwards-compatible static export.
 * Existing code that imports `colors` still compiles and renders the light
 * palette. New/updated code should prefer `useColors()` from the theme hook.
 */
export const colors = lightColors;

/**
 * Resolve a user preference + device scheme into a concrete color scheme.
 * Pure function — easily testable without React.
 */
export function resolveColorScheme(
  preference: ThemePreference,
  deviceScheme: ColorScheme | null | undefined,
): ColorScheme {
  if (preference === 'light' || preference === 'dark') return preference;
  return deviceScheme === 'dark' ? 'dark' : 'light';
}

/**
 * Return the correct palette for a given resolved scheme.
 */
export function getColorsForScheme(scheme: ColorScheme): ColorPalette {
  return scheme === 'dark' ? darkColors : lightColors;
}

/**
 * Validate that a string is a valid ThemePreference.
 */
export function isValidThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const fontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
} as const;

export const touchTargetMin = 44;
