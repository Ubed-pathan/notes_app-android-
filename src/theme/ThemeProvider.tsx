import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { MD3DarkTheme, MD3LightTheme, Provider as PaperProvider } from 'react-native-paper';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  isDark: boolean;
};

const THEME_MODE_KEY = 'theme.mode.v1';

const ThemeContext = createContext<ThemeContextValue>({ mode: 'system', setMode: () => {}, isDark: false });

const lightPalette = {
  ...MD3LightTheme,
  roundness: 12,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6750A4',
    secondary: '#625B71',
    background: '#F8F7FB',
    surface: '#FFFFFF',
    surfaceVariant: '#F2EDF7',
    outline: '#C4C7C5',
    outlineVariant: '#E1E2E6',
  },
};

const darkPalette = {
  ...MD3DarkTheme,
  roundness: 12,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#CFBCFF',
    secondary: '#CCC2DC',
    background: '#121216',
    surface: '#1B1B1F',
    surfaceVariant: '#2A2831',
    outline: '#8A8A8E',
    outlineVariant: '#3A3A3F',
  },
};

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_MODE_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setModeState(saved);
        }
      } catch {}
    })();
  }, []);

  const setMode = async (m: ThemeMode) => {
    setModeState(m);
    try { await AsyncStorage.setItem(THEME_MODE_KEY, m); } catch {}
  };

  const isDark = useMemo(() => {
    if (mode === 'system') return system === 'dark';
    return mode === 'dark';
  }, [mode, system]);

  const paperTheme = isDark ? (darkPalette as typeof MD3DarkTheme) : (lightPalette as typeof MD3LightTheme);

  const ctx = useMemo(() => ({ mode, setMode, isDark }), [mode, isDark]);

  return (
    <ThemeContext.Provider value={ctx}>
      <PaperProvider theme={paperTheme}>{children}</PaperProvider>
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
