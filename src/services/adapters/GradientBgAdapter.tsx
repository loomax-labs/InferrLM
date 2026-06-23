import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';

export function GradientBg() {
  const { theme: currentTheme } = useTheme();
  const colors = theme[currentTheme as 'light' | 'dark'];

  return (
    <LinearGradient
      colors={[
        colors.bgGradStart + '40',
        colors.bgGradEnd + '30',
        colors.background + (Platform.OS === 'web' ? 'FF' : '80'),
      ]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    />
  );
}

const styles = StyleSheet.create({
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    pointerEvents: 'none' as const,
  },
});
