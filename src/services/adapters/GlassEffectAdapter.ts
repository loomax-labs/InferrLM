import { Platform } from 'react-native';
import {
  GlassView,
  isLiquidGlassAvailable as checkLiquidGlass,
} from 'expo-glass-effect';

export { GlassView };
export type { GlassViewProps, GlassStyle, GlassColorScheme } from 'expo-glass-effect';

export function isLiquidGlassAvailable(): boolean {
  return Platform.OS === 'ios' && checkLiquidGlass();
}

export function glassStyle(isDark: boolean): 'clear' | 'regular' {
  return isDark ? 'clear' : 'regular';
}
