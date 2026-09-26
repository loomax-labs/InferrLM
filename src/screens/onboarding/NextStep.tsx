import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';

type NextStepProps = {
  body: string;
};

export function NextStepView({ body }: NextStepProps) {
  const { theme: currentTheme } = useTheme();
  const colors = theme[currentTheme];

  return (
    <View>
      <Text style={[styles.body, { color: colors.text }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 24 },
});
