import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';
import type { ExpertiseLevel, OnboardingIntentId } from '../../onboarding/types';
import { intentLabelsForExpertise } from '../../onboarding/lessons';
import type { OnboardingExpertise } from '../../onboarding/lessons';
import { useT } from '../../i18n';

export type ProfilePhase = 'welcome' | 'expertise' | 'intents';

const EXPERTISE_OPTIONS: { value: ExpertiseLevel; labelKey: 'onboarding.new' | 'onboarding.comfortable' | 'onboarding.experienced' }[] = [
  { value: 'new', labelKey: 'onboarding.new' },
  { value: 'comfortable', labelKey: 'onboarding.comfortable' },
  { value: 'experienced', labelKey: 'onboarding.experienced' },
];

type ProfileStepProps = {
  phase: ProfilePhase;
  expertise: ExpertiseLevel | null;
  intents: OnboardingIntentId[];
  onSelectExpertise: (value: ExpertiseLevel) => void;
  onToggleIntent: (intent: OnboardingIntentId) => void;
};

export function ProfileStep({
  phase,
  expertise,
  intents,
  onSelectExpertise,
  onToggleIntent,
}: ProfileStepProps) {
  const t = useT();
  const { theme: currentTheme } = useTheme();
  const colors = theme[currentTheme];

  if (phase === 'welcome') {
    return (
      <View>
        <Text style={[styles.body, { color: colors.text }]}>
          {t('onboarding.welcomeBody')}
        </Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          {t('onboarding.welcomeHint')}
        </Text>
      </View>
    );
  }

  if (phase === 'expertise') {
    return (
      <View style={styles.gap}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('onboarding.expertiseHint')}
        </Text>
        {EXPERTISE_OPTIONS.map((option) => {
          const selected = expertise === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => onSelectExpertise(option.value)}
              style={[
                styles.choice,
                {
                  backgroundColor: selected ? colors.primary : colors.cardBackground,
                  borderColor: selected ? colors.primary : colors.borderColor,
                },
              ]}
            >
              <Text style={{ color: selected ? colors.headerText : colors.text, fontSize: 16 }}>
                {t(option.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  const level = (expertise ?? 'new') as OnboardingExpertise;
  const options = intentLabelsForExpertise(level);

  return (
    <View style={styles.gap}>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t('onboarding.intentsHint')}
      </Text>
      {options.map(({ intent, label }) => {
        const selected = intents.includes(intent as OnboardingIntentId);
        return (
          <TouchableOpacity
            key={intent}
            onPress={() => onToggleIntent(intent as OnboardingIntentId)}
            style={[
              styles.choice,
              {
                backgroundColor: selected ? colors.primary : colors.cardBackground,
                borderColor: selected ? colors.primary : colors.borderColor,
              },
            ]}
          >
            <Text style={{ color: selected ? colors.headerText : colors.text, fontSize: 16 }}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 17, lineHeight: 26 },
  hint: { fontSize: 14, marginTop: 16, lineHeight: 22 },
  subtitle: { fontSize: 15, marginBottom: 8, lineHeight: 22 },
  gap: { gap: 10 },
  choice: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
});
