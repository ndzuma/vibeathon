import { Platform } from 'react-native';

// ─── Brand Palette (dark base — always used for accents/vibes) ────────────────
export const Brand = {
  accent: '#3B6EF8',
  accentMuted: 'rgba(59,110,248,0.18)',
  danger: '#FF453A',
  success: '#32D74B',
  vibeEmpty: '#3B6EF8',
  vibeQuiet: '#32D74B',
  vibeBusy: '#FF9F0A',
  vibeChaos: '#FF453A',
} as const;

// ─── Theme tokens per color scheme ────────────────────────────────────────────
export const DarkThemeColors = {
  bg: '#0A0A0A',
  surface: '#141414',
  card: '#1C1C1E',
  border: 'rgba(255,255,255,0.08)',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.55)',
  textTertiary: 'rgba(255,255,255,0.30)',
  textInverse: '#0A0A0A',
  tabBarBg: 'rgba(14,14,16,0.92)',
  tabBarBorder: 'rgba(255,255,255,0.10)',
  inputBg: '#141414',
  inputFocusBg: '#1C1C2E',
  statusBar: 'light-content' as 'light-content' | 'dark-content',
} as const;

export const LightThemeColors = {
  bg: '#F5F5F7',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  border: 'rgba(0,0,0,0.09)',
  textPrimary: '#0A0A0A',
  textSecondary: 'rgba(0,0,0,0.50)',
  textTertiary: 'rgba(0,0,0,0.28)',
  textInverse: '#FFFFFF',
  tabBarBg: 'rgba(255,255,255,0.85)',
  tabBarBorder: 'rgba(0,0,0,0.08)',
  inputBg: '#F0F0F5',
  inputFocusBg: '#E8EEFF',
  statusBar: 'dark-content' as 'light-content' | 'dark-content',
} as const;

export type ThemeColors = {
  bg: string;
  surface: string;
  card: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  tabBarBg: string;
  tabBarBorder: string;
  inputBg: string;
  inputFocusBg: string;
  statusBar: 'light-content' | 'dark-content';
};

/** Returns the right token set for the current color scheme */
export function getThemeColors(isDark: boolean): ThemeColors {
  return isDark ? DarkThemeColors : LightThemeColors;
}

// ─── Legacy – kept for backwards compat (always dark) ─────────────────────────
export const Text = {
  primary: DarkThemeColors.textPrimary,
  secondary: DarkThemeColors.textSecondary,
  tertiary: DarkThemeColors.textTertiary,
  inverse: DarkThemeColors.textInverse,
  accent: Brand.accent,
} as const;

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: DarkThemeColors.bg,
    backgroundElement: DarkThemeColors.card,
    backgroundSelected: '#2E3135',
    textSecondary: Text.secondary,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// ─── Typography ───────────────────────────────────────────────────────────────
export const FontFamily = {
  sans: 'Geist-Regular',
  sansMedium: 'Geist-Medium',
  sansSemiBold: 'Geist-SemiBold',
  sansBold: 'Geist-Bold',
  system: Platform.select({ ios: 'System', android: 'Roboto', default: 'System' }),
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
  display: 38,
} as const;

export const LineHeight = {
  tight: 1.15,
  normal: 1.4,
  relaxed: 1.6,
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  seven: 32,
  eight: 40,
  nine: 48,
  ten: 64,
} as const;

// ─── Radii ────────────────────────────────────────────────────────────────────
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────
export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  lg: {
    shadowColor: Brand.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 10,
  },
} as const;

// ─── Layout constants ─────────────────────────────────────────────────────────
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

export const Fonts = Platform.select({
  ios: { sans: FontFamily.sans, serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: FontFamily.sans, serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: { sans: FontFamily.sans, serif: 'serif', rounded: 'normal', mono: 'monospace' },
});
