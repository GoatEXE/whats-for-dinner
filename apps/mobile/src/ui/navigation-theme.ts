import type { Theme } from '@react-navigation/native';
import { type ColorPalette, type ColorScheme } from './theme';

/**
 * Build a react-navigation Theme from our color palette.
 * This drives header, tab-bar, card, and border colors automatically.
 */
export function buildNavigationTheme(
  scheme: ColorScheme,
  palette: ColorPalette,
): Theme {
  return {
    dark: scheme === 'dark',
    colors: {
      primary: palette.accent,
      background: palette.background,
      card: palette.surface,
      text: palette.text,
      border: palette.surfaceBorder,
      notification: palette.accent,
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' },
      medium: { fontFamily: 'System', fontWeight: '500' },
      bold: { fontFamily: 'System', fontWeight: '700' },
      heavy: { fontFamily: 'System', fontWeight: '800' },
    },
  };
}
