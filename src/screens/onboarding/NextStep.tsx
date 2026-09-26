import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';
import { OpenSansFont } from '../../hooks/OpenSansFont';

type NextStepProps = {
  body: string;
};

export function NextStepView({ body }: NextStepProps) {
  const { theme: currentTheme } = useTheme();
  const colors = theme[currentTheme];
  const { fonts } = OpenSansFont();
  const lines = body
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <View>
      <View style={[styles.mark, { backgroundColor: colors.success }]}>
        <MaterialCommunityIcons name="check" size={32} color="#fff" />
      </View>
      <View style={styles.gap}>
        {(lines.length ? lines : [body]).map((line, index) => (
          <View key={index} style={[styles.card, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.index, fonts.bold, { color: colors.primary }]}>{index + 1}</Text>
            <Text style={[styles.body, fonts.regular, { color: colors.text }]}>{line}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  gap: { gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 16,
    padding: 14,
  },
  index: { fontSize: 16, width: 18 },
  body: { flex: 1, fontSize: 16, lineHeight: 24 },
});
