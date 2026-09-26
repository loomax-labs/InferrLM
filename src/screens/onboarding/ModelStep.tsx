import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';
import { OpenSansFont } from '../../hooks/OpenSansFont';
import type { ExpertiseLevel } from '../../onboarding/types';
import type { RecommendedModel, RecommendationReason } from '../../onboarding/recommendModels';
import { parseModelSizeBytes } from '../../onboarding/recommendModels';
import { useT } from '../../i18n';

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

const VISIBLE_TAGS = ['recommended', 'fastest', 'vision', 'reasoning', 'coding', 'litert', 'llama.cpp'] as const;

function tagLabel(
  tag: (typeof VISIBLE_TAGS)[number],
  t: (key: string) => string,
): string {
  if (tag === 'recommended') return t('models.recommended');
  if (tag === 'fastest') return t('models.fastest');
  if (tag === 'vision') return t('models.vision');
  if (tag === 'reasoning') return t('models.reasoning');
  if (tag === 'coding') return t('models.coding');
  if (tag === 'litert') return t('models.litert');
  return t('models.llamaCpp');
}

export function ModelStep({
  expertise,
  recommendations,
  selectedNames,
  onToggle,
}: ModelStepProps) {
  const t = useT();
  const { theme: currentTheme } = useTheme();
  const colors = theme[currentTheme];
  const { fonts } = OpenSansFont();
  const selectedFill = currentTheme === 'dark' ? colors.primary + '33' : colors.primary + '16';

  return (
    <View style={styles.gap}>
      <Text style={[styles.subtitle, fonts.regular, { color: colors.textSecondary }]}>
        {expertise === 'new'
          ? 'One file is enough to start. We picked one for you.'
          : 'Choose the models you want to download now.'}
      </Text>
      {recommendations.map((rec) => {
        const selected = selectedNames.includes(rec.model.name);
        const sizeGb = (parseModelSizeBytes(rec.model.size) / 1024 ** 3).toFixed(1);
        const hasHelper = Boolean(rec.model.additionalFiles?.length);
        const tags = (rec.model.tags ?? []).filter((tag) => {
          if (!VISIBLE_TAGS.includes(tag as (typeof VISIBLE_TAGS)[number])) return false;
          if (expertise === 'new' && (tag === 'litert' || tag === 'llama.cpp')) return false;
          return true;
        });

        return (
          <TouchableOpacity
            key={rec.model.name}
            onPress={() => onToggle(rec.model.name)}
            activeOpacity={0.85}
            style={[
              styles.card,
              { backgroundColor: selected ? selectedFill : colors.cardBackground },
            ]}
          >
            <View style={styles.top}>
              <View style={[styles.mark, { backgroundColor: selected ? colors.primary : colors.background }]}>
                <MaterialCommunityIcons
                  name={selected ? 'check' : 'cube-outline'}
                  size={20}
                  color={selected ? colors.headerText : colors.primary}
                />
              </View>
              <View style={styles.copy}>
                <Text style={[styles.name, fonts.semibold, { color: colors.text }]}>{rec.model.name}</Text>
                <Text style={[styles.reason, fonts.regular, { color: colors.textSecondary }]}>
                  {reasonText(rec.reason, expertise)}
                </Text>
              </View>
            </View>
            <View style={styles.meta}>
              <View style={[styles.pill, { backgroundColor: colors.background }]}>
                <Text style={[styles.pillText, fonts.medium, { color: colors.text }]}>{sizeGb} GB</Text>
              </View>
              {tags.map((tag) => (
                <View key={tag} style={[styles.pill, { backgroundColor: colors.background }]}>
                  <Text style={[styles.pillText, fonts.medium, { color: colors.text }]}>
                    {tagLabel(tag as (typeof VISIBLE_TAGS)[number], t)}
                  </Text>
                </View>
              ))}
              {expertise === 'experienced' ? (
                <View style={[styles.pill, { backgroundColor: colors.background }]}>
                  <Text style={[styles.pillText, fonts.medium, { color: colors.text }]}>
                    {rec.model.quantization}
                    {hasHelper ? ' + extra files' : ''}
                  </Text>
                </View>
              ) : null}
              {expertise === 'new' && hasHelper ? (
                <View style={[styles.pill, { backgroundColor: colors.background }]}>
                  <Text style={[styles.pillText, fonts.medium, { color: colors.text }]}>
                    {t('onboarding.photoHelper')}
                  </Text>
                </View>
              ) : null}
            </View>
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
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mark: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1 },
  name: { fontSize: 16, lineHeight: 22 },
  reason: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: { fontSize: 12 },
});
