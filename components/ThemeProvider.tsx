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
  background: '#F2F2F7',
  card: '#fff',
  text: '#000',
  secondaryText: '#666',
  accent: '#9d9e9e',
  error: '#FF3B30',
  border: '#E5E5EA',
};

const darkColors = {
  background: '#18191A',
  card: '#232526',
  text: '#fff',
  secondaryText: '#aaa',
  accent: '#9d9e9e',
  error: '#FF3B30',
  border: '#333',
};

export type ThemeType = 'light' | 'dark' | 'system';

interface ThemeContextProps {
  theme: ThemeType;
  colorScheme: 'light' | 'dark';
  colors: typeof lightColors;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

const STORAGE_KEY = 'user-theme-preference';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
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
    <ThemeContext.Provider value={{ theme, colorScheme, colors, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
