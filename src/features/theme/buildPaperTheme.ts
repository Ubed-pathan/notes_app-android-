import { ThemePalette, contrastText, darken, lighten } from './colorUtils';
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

/** Fixed app chrome — not affected by custom accent palette */
const FIXED_LIGHT = {
  background: '#F5F3FF',
  surface: '#FFFFFF',
  surfaceVariant: '#EDE9FE',
  onBackground: '#1C1B1F',
  onSurface: '#1C1B1F',
  onSurfaceVariant: '#49454F',
  outline: '#C4C7C5',
  outlineVariant: '#E8E4F3',
};

const FIXED_DARK = {
  background: '#0F0E14',
  surface: '#1A1825',
  surfaceVariant: '#2A2838',
  onBackground: '#E6E1E5',
  onSurface: '#E6E1E5',
  onSurfaceVariant: '#CAC4D0',
  outline: '#8A8A8E',
  outlineVariant: '#3A3848',
};

export function buildPaperTheme(isDark: boolean, palette: ThemePalette) {
  const base = isDark ? MD3DarkTheme : MD3LightTheme;
  const fixed = isDark ? FIXED_DARK : FIXED_LIGHT;

  return {
    ...base,
    roundness: 16,
    colors: {
      ...base.colors,
      ...fixed,

      // Only these change with Custom Accent Colors (buttons, tabs, cards, alerts)
      primary: palette.primary,
      onPrimary: contrastText(palette.primary),
      primaryContainer: isDark ? darken(palette.primary, 0.25) : lighten(palette.primary, 0.82),
      onPrimaryContainer: isDark ? lighten(palette.primary, 0.75) : darken(palette.primary, 0.35),

      secondary: palette.accentSecondary,
      onSecondary: contrastText(palette.accentSecondary),
      secondaryContainer: isDark
        ? darken(palette.accentSecondary, 0.3)
        : lighten(palette.accentSecondary, 0.85),
      onSecondaryContainer: isDark
        ? lighten(palette.accentSecondary, 0.7)
        : darken(palette.accentSecondary, 0.35),

      tertiary: palette.alertOptions,
      onTertiary: contrastText(palette.alertOptions),
      tertiaryContainer: isDark ? darken(palette.alertOptions, 0.25) : lighten(palette.alertOptions, 0.82),
      onTertiaryContainer: isDark ? lighten(palette.alertOptions, 0.7) : darken(palette.alertOptions, 0.3),

      error: palette.alertOptions,
      onError: contrastText(palette.alertOptions),
    },
  };
}
