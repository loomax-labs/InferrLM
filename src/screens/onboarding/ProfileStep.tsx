import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';
import { OpenSansFont } from '../../hooks/OpenSansFont';
import type { ExpertiseLevel, OnboardingIntentId } from '../../onboarding/types';
import { intentLabelsForExpertise } from '../../onboarding/lessons';
import type { OnboardingExpertise } from '../../onboarding/lessons';
import { useT } from '../../i18n';

export type ProfilePhase = 'welcome' | 'expertise' | 'intents';

const EXPERTISE_OPTIONS: {
  value: ExpertiseLevel;
  labelKey: 'onboarding.new' | 'onboarding.comfortable' | 'onboarding.experienced';
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { value: 'new', labelKey: 'onboarding.new', icon: 'sprout' },
  { value: 'comfortable', labelKey: 'onboarding.comfortable', icon: 'message-text-outline' },
  { value: 'experienced', labelKey: 'onboarding.experienced', icon: 'tune-variant' },
];

const INTENT_ICONS: Record<OnboardingIntentId, keyof typeof MaterialCommunityIcons.glyphMap> = {
  chat: 'chat-outline',
  coding: 'code-tags',
  reasoning: 'head-lightbulb-outline',
  photos: 'image-outline',
  voice: 'microphone-outline',
  files: 'folder-search-outline',
  api: 'lan',
  explore: 'compass-outline',
};

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
  const { fonts } = OpenSansFont();
  const iconIdle = currentTheme === 'dark' ? colors.primary + '33' : colors.primary + '18';

  if (phase === 'welcome') {
    return (
      <View>
        <View style={[styles.hero, { backgroundColor: colors.primary }]}>
          <MaterialCommunityIcons name="robot-happy-outline" size={52} color={colors.headerText} />
        </View>
        <Text style={[styles.body, fonts.regular, { color: colors.text }]}>
          {t('onboarding.welcomeBody')}
        </Text>
        <View style={[styles.hintCard, { backgroundColor: colors.cardBackground }]}>
          <MaterialCommunityIcons name="information-outline" size={20} color={colors.primary} />
          <Text style={[styles.hint, fonts.regular, { color: colors.textSecondary }]}>
            {t('onboarding.welcomeHint')}
          </Text>
        </View>
      </View>
    );
  }

  if (phase === 'expertise') {
    return (
      <View style={styles.gap}>
        <Text style={[styles.subtitle, fonts.regular, { color: colors.textSecondary }]}>
          {t('onboarding.expertiseHint')}
        </Text>
        {EXPERTISE_OPTIONS.map((option) => {
          const selected = expertise === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => onSelectExpertise(option.value)}
              activeOpacity={0.8}
              style={[
                styles.choice,
                { backgroundColor: selected ? colors.primary : colors.cardBackground },
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: selected ? 'rgba(255,255,255,0.18)' : iconIdle }]}>
                <MaterialCommunityIcons
                  name={option.icon}
                  size={22}
                  color={selected ? colors.headerText : colors.primary}
                />
              </View>
              <Text
                style={[
                  styles.choiceLabel,
                  fonts.semibold,
                  { color: selected ? colors.headerText : colors.text },
                ]}
              >
                {t(option.labelKey)}
              </Text>
              {selected ? (
                <MaterialCommunityIcons name="check" size={20} color={colors.headerText} />
              ) : null}
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
      <Text style={[styles.subtitle, fonts.regular, { color: colors.textSecondary }]}>
        {t('onboarding.intentsHint')}
      </Text>
      {options.map(({ intent, label }) => {
        const id = intent as OnboardingIntentId;
        const selected = intents.includes(id);
        return (
          <TouchableOpacity
            key={intent}
            onPress={() => onToggleIntent(id)}
            activeOpacity={0.8}
            style={[
              styles.choice,
              { backgroundColor: selected ? colors.primary : colors.cardBackground },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: selected ? 'rgba(255,255,255,0.18)' : iconIdle }]}>
              <MaterialCommunityIcons
                name={INTENT_ICONS[id]}
                size={22}
                color={selected ? colors.headerText : colors.primary}
              />
            </View>
            <Text
              style={[
                styles.choiceLabel,
                fonts.semibold,
                { color: selected ? colors.headerText : colors.text },
              ]}
            >
              {label}
            </Text>
            {selected ? (
              <MaterialCommunityIcons name="check" size={20} color={colors.headerText} />
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  body: { fontSize: 17, lineHeight: 26 },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 20,
    padding: 14,
    borderRadius: 16,
  },
  hint: { flex: 1, fontSize: 14, lineHeight: 21 },
  subtitle: { fontSize: 15, marginBottom: 6, lineHeight: 22 },
  gap: { gap: 10 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceLabel: { flex: 1, fontSize: 16, lineHeight: 22 },
});
