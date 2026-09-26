import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';
import type { ExpertiseLevel } from '../../onboarding/types';
import type { RecommendedModel, RecommendationReason } from '../../onboarding/recommendModels';
import { parseModelSizeBytes } from '../../onboarding/recommendModels';

type ModelStepProps = {
  expertise: ExpertiseLevel;
  recommendations: RecommendedModel[];
  selectedNames: string[];
  onToggle: (name: string) => void;
};

function reasonText(reason: RecommendationReason, expertise: ExpertiseLevel): string {
  const map: Record<RecommendationReason, string> = {
    default: 'Good fit for your choices',
    recommended: 'Recommended pick',
    fast: 'Light on phone memory',
    vision: 'Can look at photos',
    audio: 'Works with audio',
    coding: 'Better for code',
    reasoning: 'Stronger on hard questions',
  };
  if (expertise === 'new') {
    if (reason === 'recommended' || reason === 'fast') {
      return reason === 'fast' ? 'Light on phone memory' : 'Good first choice';
    }
    if (reason === 'vision') return 'Can look at photos';
    if (reason === 'coding') return 'Better for code';
    if (reason === 'reasoning') return 'Good for hard questions';
    return 'Suggested for you';
  }
  return map[reason];
}

function engineLabel(rec: RecommendedModel): string | null {
  const tags = rec.model.tags ?? [];
  if (tags.includes('litert')) return 'LiteRT';
  if (tags.includes('llama.cpp')) return 'llama.cpp';
  return null;
}

export function ModelStep({
  expertise,
  recommendations,
  selectedNames,
  onToggle,
}: ModelStepProps) {
  const { theme: currentTheme } = useTheme();
  const colors = theme[currentTheme];
  const multiSelect = expertise === 'experienced';

  return (
    <View style={styles.gap}>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {expertise === 'new'
          ? 'One file is enough to start. We picked one for you.'
          : 'Choose the models you want to download now.'}
      </Text>
      {recommendations.map((rec) => {
        const selected = selectedNames.includes(rec.model.name);
        const sizeGb = (parseModelSizeBytes(rec.model.size) / 1024 ** 3).toFixed(2);
        const engine = engineLabel(rec);
        const hasHelper = Boolean(rec.model.additionalFiles?.length);

        return (
          <TouchableOpacity
            key={rec.model.name}
            onPress={() => onToggle(rec.model.name)}
            style={[
              styles.card,
              {
                backgroundColor: selected ? colors.cardBackground : colors.background,
                borderColor: selected ? colors.primary : colors.borderColor,
              },
            ]}
          >
            <Text style={[styles.name, { color: colors.text }]}>{rec.model.name}</Text>
            <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
              {sizeGb} GB · {reasonText(rec.reason, expertise)}
            </Text>
            {expertise !== 'new' && engine ? (
              <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{engine}</Text>
            ) : null}
            {expertise === 'experienced' ? (
              <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
                {rec.model.quantization}
                {hasHelper ? ' · includes extra files' : ''}
              </Text>
            ) : null}
            {expertise === 'new' && hasHelper ? (
              <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
                Includes a photo helper
              </Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 12 },
  subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 4 },
  card: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 2,
  },
  name: { fontSize: 16, fontWeight: '600' },
});
