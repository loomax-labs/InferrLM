import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance, AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeType, ThemeColors } from '../types/theme';

interface ThemeContextType {
  theme: ThemeColors;
  selectedTheme: ThemeType;
  toggleTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  selectedTheme: 'system',
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>('system');
  const [theme, setTheme] = useState<ThemeColors>(
    (Appearance.getColorScheme() as ThemeColors) || 'light'
  );

  useEffect(() => {
    loadThemePreference();
  }, []);

  useEffect(() => {
    if (selectedTheme !== 'system') {
      setTheme(selectedTheme as ThemeColors);
      if (Platform.OS === 'android') {
        Appearance.setColorScheme(selectedTheme as ThemeColors);
      }
      return;
    }

    const readScheme = () => (Appearance.getColorScheme() as ThemeColors) || 'light';

    if (Platform.OS === 'android') {
      Appearance.setColorScheme('unspecified');
    }

    setTheme(readScheme());

    const appearanceSub = Appearance.addChangeListener(({ colorScheme }) => {
      const next = (colorScheme as ThemeColors) || 'light';
      setTheme(next);
    });

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        setTheme(readScheme());
      }
    });

    return () => {
      appearanceSub.remove();
      appStateSub.remove();
    };
  }, [selectedTheme]);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('@theme_preference');
      if (savedTheme) {
        setSelectedTheme(savedTheme as ThemeType);
      }
    } catch (error) {
    }
  };

  const toggleTheme = async (newTheme: ThemeType) => {
    setSelectedTheme(newTheme);
    try {
      await AsyncStorage.setItem('@theme_preference', newTheme);
    } catch (error) {
    }
  };

  return (
    <ThemeContext.Provider value={{ 
      theme,
      selectedTheme,
      toggleTheme 
    }}>
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
