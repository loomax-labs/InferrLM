import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';

type LabsTasksSectionProps = {
  onOpenPromptLab: () => void;
  onOpenSkillManager: () => void;
  onOpenAudioScribe: () => void;
  onOpenMobileActions: () => void;
  onOpenTinyGarden: () => void;
  onOpenBenchmark: () => void;
};

type LabItem = {
  key: string;
  label: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  lightAccent: string;
  darkAccent: string;
  onPress: () => void;
};

const LabsTasksSection = ({
  onOpenPromptLab,
  onOpenSkillManager,
  onOpenAudioScribe,
  onOpenMobileActions,
  onOpenTinyGarden,
  onOpenBenchmark,
}: LabsTasksSectionProps) => {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];

  const items: LabItem[] = [
    {
      key: 'prompt-lab',
      label: 'Prompt Lab',
      description: 'Test prompts with live output',
      icon: 'flask-outline',
      lightAccent: '#5E35B1',
      darkAccent: '#9C6EE8',
      onPress: onOpenPromptLab,
    },
    {
      key: 'skills',
      label: 'Skills',
      description: 'Manage reusable skills & secrets',
      icon: 'shape-outline',
      lightAccent: '#1565C0',
      darkAccent: '#5A9FE3',
      onPress: onOpenSkillManager,
    },
    {
      key: 'audio-scribe',
      label: 'Audio Scribe',
      description: 'Transcribe or translate audio',
      icon: 'waveform',
      lightAccent: '#00695C',
      darkAccent: '#4DB6A9',
      onPress: onOpenAudioScribe,
    },
    {
      key: 'mobile-actions',
      label: 'Mobile Actions',
      description: 'Run device actions via AI',
      icon: 'cellphone-cog',
      lightAccent: '#AD1457',
      darkAccent: '#E57DAB',
      onPress: onOpenMobileActions,
    },
    {
      key: 'tiny-garden',
      label: 'Tiny Garden',
      description: 'Tool-driven planting game',
      icon: 'sprout-outline',
      lightAccent: '#2E7D32',
      darkAccent: '#66BB6A',
      onPress: onOpenTinyGarden,
    },
    {
      key: 'benchmark',
      label: 'Benchmark',
      description: 'Measure model speed & performance',
      icon: 'speedometer',
      lightAccent: '#B54708',
      darkAccent: '#FFA040',
      onPress: onOpenBenchmark,
    },
  ];

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.sectionLabel, { color: themeColors.secondaryText }]}>LABS & TOOLS</Text>
      <View style={styles.grid}>
        {items.map(item => {
          const accent = currentTheme === 'dark' ? item.darkAccent : item.lightAccent;
          const iconBg = currentTheme === 'dark' ? accent + '28' : accent + '16';
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.card, { backgroundColor: themeColors.borderColor }]}
              onPress={item.onPress}
              activeOpacity={0.75}
            >
              <View style={[styles.cardIconWrap, { backgroundColor: iconBg }]}>
                <MaterialCommunityIcons name={item.icon} size={26} color={accent} />
              </View>
              <Text style={[styles.cardTitle, { color: themeColors.text }]} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={[styles.cardDesc, { color: themeColors.secondaryText }]} numberOfLines={2}>
                {item.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginLeft: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '47%',
    borderRadius: 18,
    padding: 16,
    minHeight: 130,
  },
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
});

export default LabsTasksSection;
