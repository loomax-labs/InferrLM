export type ThemeColors = 'light' | 'dark';

export type ThemeType = ThemeColors | 'system';

export interface ThemeContextType {
  theme: ThemeColors;  
  systemTheme: ThemeColors;
  selectedTheme: ThemeType;  
  toggleTheme: (theme: ThemeType) => Promise<void>;
} 
