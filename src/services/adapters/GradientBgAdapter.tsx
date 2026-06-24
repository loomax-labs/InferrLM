import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';

function expandHex(hex: string): string {
  if (hex.length === 4 && hex.startsWith('#')) {
    return '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  return hex;
}

export function GradientBg() {
  const { theme: currentTheme } = useTheme();
  const colors = theme[currentTheme as 'light' | 'dark'];

  const alpha = Platform.OS === 'web' ? 'FF' : '80';

  return (
    <LinearGradient
      colors={[
        expandHex(colors.bgGradStart) + '40',
        expandHex(colors.bgGradEnd) + '30',
        expandHex(colors.background) + alpha,
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
