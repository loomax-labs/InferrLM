import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeType, ThemeColors } from '../types/theme';

interface ThemeContextType {
  theme: ThemeColors;
  systemTheme: ThemeColors;
  selectedTheme: ThemeType;
  toggleTheme: (theme: ThemeType) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  systemTheme: 'light',
  selectedTheme: 'system',
  toggleTheme: async () => {},
});

const themeKey = '@theme_preference';

const toTheme = (scheme: string | null | undefined): ThemeColors => (
  scheme === 'dark' ? 'dark' : 'light'
);

const isThemeType = (value: string | null): value is ThemeType => (
  value === 'system' || value === 'light' || value === 'dark'
);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemTheme = toTheme(useColorScheme());
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>('system');
  const theme = selectedTheme === 'system' ? systemTheme : selectedTheme;

  useEffect(() => {
    let mounted = true;

    async function loadThemePreference() {
      try {
        const savedTheme = await AsyncStorage.getItem(themeKey);
        if (mounted && isThemeType(savedTheme)) {
          setSelectedTheme(savedTheme);
          console.log('theme_load', savedTheme);
        }
      } catch (error) {
      }
    }

    loadThemePreference();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    Appearance.setColorScheme(selectedTheme === 'system' ? 'unspecified' : selectedTheme);
    console.log('theme_apply', selectedTheme);
  }, [selectedTheme]);

  const toggleTheme = useCallback(async (newTheme: ThemeType) => {
    setSelectedTheme(newTheme);
    try {
      await AsyncStorage.setItem(themeKey, newTheme);
      console.log('theme_select', newTheme);
    } catch (error) {
    }
  }, []);

  const value = useMemo(() => ({
    theme,
    systemTheme,
    selectedTheme,
    toggleTheme,
  }), [selectedTheme, systemTheme, theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 
