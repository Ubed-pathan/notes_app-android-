import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_PALETTE,
  ThemePalette,
  PALETTE_STORAGE_KEY,
  randomHex,
} from '../features/theme/colorUtils';
import { buildPaperTheme } from '../features/theme/buildPaperTheme';

type ThemeMode = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  isDark: boolean;
  palette: ThemePalette;
  setPalette: (p: ThemePalette) => void;
  randomizePalette: () => void;
  resetPalette: () => void;
};

const THEME_MODE_KEY = 'theme.mode.v1';

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  setMode: () => {},
  isDark: false,
  palette: DEFAULT_PALETTE,
  setPalette: () => {},
  randomizePalette: () => {},
  resetPalette: () => {},
});

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [palette, setPaletteState] = useState<ThemePalette>(DEFAULT_PALETTE);

  useEffect(() => {
    (async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_MODE_KEY);
        if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
          setModeState(savedMode);
        }
        const savedPalette = await AsyncStorage.getItem(PALETTE_STORAGE_KEY);
        if (savedPalette) {
          const parsed = JSON.parse(savedPalette) as ThemePalette;
          if (parsed.primary && parsed.accentSecondary && parsed.alertOptions) {
            setPaletteState(parsed);
          }
        }
      } catch {}
    })();
  }, []);

  const setMode = async (m: ThemeMode) => {
    setModeState(m);
    try {
      await AsyncStorage.setItem(THEME_MODE_KEY, m);
    } catch {}
  };

  const setPalette = async (p: ThemePalette) => {
    setPaletteState(p);
    try {
      await AsyncStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(p));
    } catch {}
  };

  const randomizePalette = () => {
    const next: ThemePalette = {
      primary: randomHex(),
      accentSecondary: randomHex(),
      alertOptions: randomHex(),
    };
    setPalette(next);
  };

  const resetPalette = () => {
    setPalette(DEFAULT_PALETTE);
  };

  const isDark = useMemo(() => {
    if (mode === 'system') return system === 'dark';
    return mode === 'dark';
  }, [mode, system]);

  const paperTheme = useMemo(() => buildPaperTheme(isDark, palette), [isDark, palette]);

  const ctx = useMemo(
    () => ({ mode, setMode, isDark, palette, setPalette, randomizePalette, resetPalette }),
    [mode, isDark, palette]
  );

  return (
    <ThemeContext.Provider value={ctx}>
      <PaperProvider theme={paperTheme}>{children}</PaperProvider>
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
