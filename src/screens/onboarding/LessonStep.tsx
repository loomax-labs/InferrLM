import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';
import type { LessonStep } from '../../onboarding/lessons';

type LessonStepViewProps = {
  step: LessonStep;
};

export function LessonStepView({ step }: LessonStepViewProps) {
  const { theme: currentTheme } = useTheme();
  const colors = theme[currentTheme];

  return (
    <View>
      <Text style={[styles.body, { color: colors.text }]}>{step.body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 24 },
});
