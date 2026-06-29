import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, useColorScheme } from 'react-native';
import { StatusBarHost } from '../services/adapters/StatusBarAdapter';

export default function UpdateScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const bg = isDark ? '#1E1326' : '#660880';
  const textColor = '#FFFFFF';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <StatusBarHost themeName={isDark ? 'dark' : 'light'} forceLight />
      <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]}>
        <View style={styles.arc} />
      </Animated.View>
      <Text style={[styles.title, { color: textColor }]}>Updating</Text>
      <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.7)' }]}>
        Installing the latest updates...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    width: 48,
    height: 48,
    marginBottom: 24,
  },
  arc: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: 'transparent',
    borderTopColor: '#FFFFFF',
    borderRightColor: 'rgba(255,255,255,0.3)',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
  },
});
