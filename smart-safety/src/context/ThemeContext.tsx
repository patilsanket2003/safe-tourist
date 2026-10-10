import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { readJSON, writeJSON } from '../utils/storage';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  cardBg: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  inputPlaceholder: string;
  primary: string;
  primaryHover: string;
  accent: string;
  glassBackdrop: string;
  toggleBg: string;
  toggleBorder: string;
}

// ── DARK: Brutalist black/orange tech theme (inspired by user reference) ──
const darkColors: ThemeColors = {
  background: '#0A0A0A',
  cardBg: 'rgba(18, 18, 18, 0.92)',
  cardBorder: 'rgba(249, 115, 22, 0.22)',
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#52525B',
  inputBg: 'rgba(28, 28, 28, 0.85)',
  inputBorder: 'rgba(249, 115, 22, 0.28)',
  inputText: '#FFFFFF',
  inputPlaceholder: '#52525B',
  primary: '#F97316',        // orange accent
  primaryHover: '#EA580C',   // deeper orange on hover
  accent: '#F97316',
  glassBackdrop: 'rgba(10, 10, 10, 0.82)',
  toggleBg: 'rgba(28, 28, 28, 0.9)',
  toggleBorder: 'rgba(249, 115, 22, 0.35)',
};

// ── LIGHT: Clean minimal with orange accent ──
const lightColors: ThemeColors = {
  background: '#F4F4F5',
  cardBg: 'rgba(255, 255, 255, 0.92)',
  cardBorder: 'rgba(249, 115, 22, 0.20)',
  textPrimary: '#09090B',
  textSecondary: '#52525B',
  textMuted: '#A1A1AA',
  inputBg: 'rgba(250, 250, 250, 0.80)',
  inputBorder: 'rgba(228, 228, 231, 0.9)',
  inputText: '#09090B',
  inputPlaceholder: '#A1A1AA',
  primary: '#F97316',
  primaryHover: '#EA580C',
  accent: '#F97316',
  glassBackdrop: 'rgba(244, 244, 245, 0.7)',
  toggleBg: 'rgba(255, 255, 255, 0.95)',
  toggleBorder: 'rgba(228, 228, 231, 0.9)',
};

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  isDark: true,
  colors: darkColors,
  toggleTheme: () => {},
  setTheme: () => {},
});

const THEME_STORAGE_KEY = 'user_theme_preference';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>('dark'); // Default to dark for rich aesthetics

  useEffect(() => {
    (async () => {
      const savedTheme = await readJSON<ThemeMode>(THEME_STORAGE_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemeState(savedTheme);
      } else {
        setThemeState('dark');
      }
    })();
  }, [systemScheme]);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    writeJSON(THEME_STORAGE_KEY, mode).catch(() => {});
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  const isDark = theme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, isDark, colors, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
