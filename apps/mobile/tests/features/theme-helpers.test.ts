import { describe, expect, it } from 'vitest';

import {
  resolveColorScheme,
  getColorsForScheme,
  isValidThemePreference,
  lightColors,
  darkColors,
} from '@/ui/theme';

describe('resolveColorScheme', () => {
  it('returns "light" when preference is "light" regardless of device scheme', () => {
    expect(resolveColorScheme('light', 'dark')).toBe('light');
    expect(resolveColorScheme('light', 'light')).toBe('light');
    expect(resolveColorScheme('light', null)).toBe('light');
  });

  it('returns "dark" when preference is "dark" regardless of device scheme', () => {
    expect(resolveColorScheme('dark', 'light')).toBe('dark');
    expect(resolveColorScheme('dark', 'dark')).toBe('dark');
    expect(resolveColorScheme('dark', null)).toBe('dark');
  });

  it('follows device scheme when preference is "system"', () => {
    expect(resolveColorScheme('system', 'dark')).toBe('dark');
    expect(resolveColorScheme('system', 'light')).toBe('light');
  });

  it('defaults to "light" when preference is "system" and device scheme is null/undefined', () => {
    expect(resolveColorScheme('system', null)).toBe('light');
    expect(resolveColorScheme('system', undefined)).toBe('light');
  });
});

describe('getColorsForScheme', () => {
  it('returns light palette for "light"', () => {
    expect(getColorsForScheme('light')).toBe(lightColors);
  });

  it('returns dark palette for "dark"', () => {
    expect(getColorsForScheme('dark')).toBe(darkColors);
  });

  it('dark and light palettes have the same set of keys', () => {
    const lightKeys = Object.keys(lightColors).sort();
    const darkKeys = Object.keys(darkColors).sort();
    expect(lightKeys).toEqual(darkKeys);
  });

  it('dark palette has different background and text from light', () => {
    expect(darkColors.background).not.toBe(lightColors.background);
    expect(darkColors.text).not.toBe(lightColors.text);
  });
});

describe('isValidThemePreference', () => {
  it.each(['system', 'light', 'dark'])('accepts "%s"', (value) => {
    expect(isValidThemePreference(value)).toBe(true);
  });

  it.each([null, undefined, '', 'auto', 'DARK', 42, true])(
    'rejects %p',
    (value) => {
      expect(isValidThemePreference(value)).toBe(false);
    },
  );
});
