import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { Appearance, ColorSchemeName, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Theme color palettes
const lightColors = {
  background: '#f8f5ed', // soft beige
  card: '#f9f6ee', // lighter beige
  secondaryBackground: '#f0ece0', // warm beige
  text: '#1f2937', // primary text (dark gray)
  secondaryText: '#4b5563', // secondary text (medium gray)
  mutedText: '#6b7280', // muted text (lighter gray)
  accent: '#1f2937', // primary button (dark gray)
  accentHover: '#374151', // hover state for primary button
  error: '#64403E',
  border: '#e5e7eb', // border-gray-200
  borderDark: '#d1d5db', // border-gray-300
  white: '#ffffff', // white for cards and content areas
};

const darkColors = {
  background: '#0a0a0a', // Softer black with slight warmth
  card: '#161616', // Elevated surface
  secondaryBackground: '#1f1f1f', // Secondary elevated surface
  text: '#f5f5f5', // Bright but not harsh white
  secondaryText: '#d1d1d1', // Readable gray
  mutedText: '#8b8b8b', // Muted but visible
  accent: '#71717a', // Elegant zinc gray accent
  accentHover: '#a1a1aa', // Lighter hover state
  error: '#ef4444', // Standard red error
  border: '#2a2a2a', // Subtle borders
  borderDark: '#3a3a3a', // Slightly darker border
  white: '#ffffff',
};

export type ThemeType = 'light' | 'dark' | 'system';

interface ThemeContextProps {
  theme: ThemeType;
  colorScheme: 'light' | 'dark';
  colors: typeof lightColors;
  defaultFontFamily: string;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

const STORAGE_KEY = 'user-theme-preference';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const defaultFontFamily = 'Satoshi-Medium';
  const [theme, setThemeState] = useState<ThemeType>('system');
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>(
    systemColorScheme || 'light'
  );

  // Load user preference from storage
  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemeState(stored);
      }
    })();
  }, []);

  // Listen to system color scheme changes
  useEffect(() => {
    if (theme === 'system') {
      setColorScheme(systemColorScheme || 'light');
    }
  }, [systemColorScheme, theme]);

  // Update color scheme when user changes theme
  useEffect(() => {
    if (theme === 'light' || theme === 'dark') {
      setColorScheme(theme);
    } else {
      setColorScheme(systemColorScheme || 'light');
    }
    AsyncStorage.setItem(STORAGE_KEY, theme);
  }, [theme, systemColorScheme]);

  const colors = colorScheme === 'dark' ? darkColors : lightColors;

  const setTheme = (t: ThemeType) => setThemeState(t);

  return (
    <ThemeContext.Provider
      value={{ theme, colorScheme, colors, defaultFontFamily, setTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
