export const palette = {
  ink950: '#061016',
  ink900: '#0A1620',
  ink800: '#12202C',
  ink700: '#1A2D3C',
  mist50: '#F4F7F9',
  mist100: '#E8EEF2',
  mist200: '#D5DFE7',
  mist300: '#B7C5D0',
  mist400: '#8496A6',
  mist500: '#5E7283',
  mist600: '#445667',
  mist700: '#2F404F',
  mist800: '#1E2D3A',
  teal400: '#2DD4BF',
  teal500: '#14B8A6',
  teal600: '#0D9488',
  teal700: '#0F766E',
  teal800: '#115E59',
  coral500: '#F0595A',
  coral600: '#E11D48',
  amber500: '#F59E0B',
  amber600: '#D97706',
  emerald500: '#10B981',
  emerald600: '#059669',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 28,
  full: 999,
} as const;

export const shadows = {
  soft: {
    shadowColor: '#0A1620',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  float: {
    shadowColor: '#0A1620',
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
} as const;

export const typography = {
  display: {
    fontSize: 30,
    fontWeight: '700' as const,
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.45,
    lineHeight: 28,
  },
  headline: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: -0.25,
    lineHeight: 23,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: -0.1,
    lineHeight: 22,
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: -0.1,
    lineHeight: 22,
  },
  callout: {
    fontSize: 14,
    fontWeight: '500' as const,
    letterSpacing: -0.05,
    lineHeight: 20,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
    letterSpacing: 0.05,
    lineHeight: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.9,
    lineHeight: 14,
  },
};

export type ColorSchemeName = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderSubtle: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryMuted: string;
  primaryText: string;
  danger: string;
  dangerMuted: string;
  warning: string;
  warningMuted: string;
  success: string;
  successMuted: string;
  overlay: string;
  tabBar: string;
  tabIcon: string;
  tabIconActive: string;
  inputBackground: string;
  chipBackground: string;
  chipActive: string;
  chipActiveText: string;
  glow: string;
  splashBackground: string;
}

export const themes: Record<ColorSchemeName, ThemeColors> = {
  light: {
    background: palette.mist50,
    backgroundSecondary: palette.mist100,
    surface: palette.white,
    surfaceElevated: palette.white,
    border: palette.mist200,
    borderSubtle: palette.mist100,
    text: palette.ink900,
    textSecondary: palette.mist600,
    textMuted: palette.mist400,
    primary: palette.teal700,
    primaryMuted: 'rgba(13, 148, 136, 0.10)',
    primaryText: palette.white,
    danger: palette.coral600,
    dangerMuted: 'rgba(225, 29, 72, 0.08)',
    warning: palette.amber600,
    warningMuted: 'rgba(217, 119, 6, 0.10)',
    success: palette.emerald600,
    successMuted: 'rgba(5, 150, 105, 0.10)',
    overlay: 'rgba(6, 16, 22, 0.48)',
    tabBar: 'rgba(255, 255, 255, 0.94)',
    tabIcon: palette.mist400,
    tabIconActive: palette.teal700,
    inputBackground: palette.mist100,
    chipBackground: palette.mist100,
    chipActive: palette.teal700,
    chipActiveText: palette.white,
    glow: 'rgba(13, 148, 136, 0.22)',
    splashBackground: palette.ink950,
  },
  dark: {
    background: palette.ink950,
    backgroundSecondary: palette.ink900,
    surface: palette.ink800,
    surfaceElevated: palette.ink700,
    border: '#243746',
    borderSubtle: '#1A2B38',
    text: '#F2F7FA',
    textSecondary: palette.mist400,
    textMuted: '#6B8193',
    primary: palette.teal400,
    primaryMuted: 'rgba(45, 212, 191, 0.12)',
    primaryText: palette.ink950,
    danger: palette.coral500,
    dangerMuted: 'rgba(240, 89, 90, 0.14)',
    warning: palette.amber500,
    warningMuted: 'rgba(245, 158, 11, 0.14)',
    success: palette.emerald500,
    successMuted: 'rgba(16, 185, 129, 0.14)',
    overlay: 'rgba(0, 0, 0, 0.62)',
    tabBar: 'rgba(10, 22, 32, 0.96)',
    tabIcon: '#6B8193',
    tabIconActive: palette.teal400,
    inputBackground: palette.ink900,
    chipBackground: palette.ink900,
    chipActive: palette.teal400,
    chipActiveText: palette.ink950,
    glow: 'rgba(45, 212, 191, 0.28)',
    splashBackground: palette.ink950,
  },
};

/** Native + JS splash brand background — keep in sync with app.json */
export const SPLASH_BACKGROUND = palette.ink950;
export const SPLASH_DURATION_MS = 4000;
