/** Centralized color tokens and sizing constants */
export const colors = {
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
