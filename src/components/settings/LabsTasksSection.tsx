import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';
import SettingsSection from './SettingsSection';

type LabsTasksSectionProps = {
  onOpenPromptLab: () => void;
  onOpenSkillManager: () => void;
  onOpenAudioScribe: () => void;
  onOpenMobileActions: () => void;
  onOpenTinyGarden: () => void;
};

type LabItem = {
  key: string;
  label: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
};

const LabsTasksSection = ({
  onOpenPromptLab,
  onOpenSkillManager,
  onOpenAudioScribe,
  onOpenMobileActions,
  onOpenTinyGarden,
}: LabsTasksSectionProps) => {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const iconColor = currentTheme === 'dark' ? '#FFFFFF' : themeColors.primary;

  const items: LabItem[] = [
    {
      key: 'prompt-lab',
      label: 'Prompt Lab',
      description: 'Single-turn prompt testing with live output and history',
      icon: 'flask-outline',
      onPress: onOpenPromptLab,
    },
    {
      key: 'skills',
      label: 'Skills',
      description: 'Manage reusable skills, imports, and secure secrets',
      icon: 'shape-outline',
      onPress: onOpenSkillManager,
    },
    {
      key: 'audio-scribe',
      label: 'Audio Scribe',
      description: 'Upload audio for transcription or translation',
      icon: 'waveform',
      onPress: onOpenAudioScribe,
    },
    {
      key: 'mobile-actions',
      label: 'Mobile Actions',
      description: 'Run device actions through tool-enabled assistant flows',
      icon: 'cellphone-cog',
      onPress: onOpenMobileActions,
    },
    {
      key: 'tiny-garden',
      label: 'Tiny Garden',
      description: 'Play with tool-driven planting, watering, and harvesting',
      icon: 'sprout-outline',
      onPress: onOpenTinyGarden,
    },
  ];

  return (
    <SettingsSection title="LABS & TASKS">
      {items.map((item, index) => (
        <TouchableOpacity
          key={item.key}
          style={[styles.settingItem, index > 0 ? styles.settingItemBorder : null]}
          onPress={item.onPress}
        >
          <View style={styles.settingLeft}>
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor:
                    currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : themeColors.primary + '20',
                },
              ]}
            >
              <MaterialCommunityIcons name={item.icon} size={22} color={iconColor} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingText, { color: themeColors.text }]}>{item.label}</Text>
              <Text style={[styles.settingDescription, { color: themeColors.secondaryText }]}>
                {item.description}
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={themeColors.secondaryText} />
        </TouchableOpacity>
      ))}
    </SettingsSection>
  );
};

const styles = StyleSheet.create({
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingItemBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
  },
});

export default LabsTasksSection;
