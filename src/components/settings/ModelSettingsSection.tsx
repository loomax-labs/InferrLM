import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';
import { EngineId } from '../../managers/inference-manager';
import SettingsSection from './SettingsSection';
import ModelSettingsCore from './ModelSettingsCore';

type ModelSettings = {
  maxTokens: number;
  temperature: number;
  topK: number;
  topP: number;
  minP: number;
  stopWords: string[];
  systemPrompt: string;
  jinja: boolean;
  grammar: string;
  nProbs: number;
  penaltyLastN: number;
  penaltyRepeat: number;
  penaltyFreq: number;
  penaltyPresent: number;
  mirostat: number;
  mirostatTau: number;
  mirostatEta: number;
  dryMultiplier: number;
  dryBase: number;
  dryAllowedLength: number;
  dryPenaltyLastN: number;
  drySequenceBreakers: string[];
  ignoreEos: boolean;
  logitBias: Array<Array<number>>;
  seed: number;
  xtcProbability: number;
  xtcThreshold: number;
  typicalP: number;
  enableThinking: boolean;
};



type ModelSettingsSectionProps = {
  modelSettings: ModelSettings;
  defaultSettings: Partial<ModelSettings>;
  error: string | null;
  onSettingsChange: (settings: Partial<ModelSettings>) => void;
  onDialogOpen: (config: any) => void;
  activeEngine?: EngineId;
  engineEnabled?: Record<EngineId, boolean>;
  onEngineToggle?: (engine: EngineId, enabled: boolean) => void;
  onOpenSystemPromptDialog?: () => void;
  enableRemoteModels?: boolean;
  onToggleRemoteModels?: (enabled: boolean) => void;
  showAppleFoundationToggle?: boolean;
  appleFoundationEnabled?: boolean;
  onToggleAppleFoundation?: (enabled: boolean) => void;
  onModelParametersPress?: () => void;
};

const ModelSettingsSection = ({
  modelSettings,
  defaultSettings,
  error,
  onSettingsChange,
  onDialogOpen,
  activeEngine,
  engineEnabled,
  onEngineToggle,
  onOpenSystemPromptDialog,
  enableRemoteModels,
  onToggleRemoteModels,
  showAppleFoundationToggle,
  appleFoundationEnabled,
  onToggleAppleFoundation,
  onModelParametersPress,
}: ModelSettingsSectionProps) => {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const iconColor = currentTheme === 'dark' ? '#FFFFFF' : themeColors.primary;

  return (
    <SettingsSection title="MODEL SETTINGS">
      <ModelSettingsCore
        onOpenSystemPromptDialog={onOpenSystemPromptDialog}
        systemPromptModified={defaultSettings.systemPrompt ? modelSettings.systemPrompt !== defaultSettings.systemPrompt : false}
        enableRemoteModels={enableRemoteModels}
        onToggleRemoteModels={onToggleRemoteModels}
        showAppleFoundationToggle={showAppleFoundationToggle}
        appleFoundationEnabled={appleFoundationEnabled}
        onToggleAppleFoundation={onToggleAppleFoundation}
        engineEnabled={engineEnabled}
        onEngineToggle={onEngineToggle}
        onDialogOpen={onDialogOpen}
      />

      <View style={styles.separator} />

      <TouchableOpacity
        style={styles.settingItem}
        onPress={onModelParametersPress}
      >
        <View style={styles.settingLeft}>
          <View style={[styles.iconContainer, { backgroundColor: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : themeColors.primary + '20' }]}>
            <MaterialCommunityIcons name="cog-outline" size={22} color={iconColor} />
          </View>
          <View style={styles.settingTextContainer}>
            <View style={styles.labelRow}>
              <Text style={[styles.settingText, { color: themeColors.text }]}>
                Model Parameters
              </Text>
              <View style={[styles.advancedTag, { backgroundColor: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : themeColors.primary + '20' }]}>
                <Text style={[styles.advancedTagText, { color: currentTheme === 'dark' ? '#FFFFFF' : themeColors.primary }]}>
                  ADVANCED
                </Text>
              </View>
            </View>
            <Text style={[styles.settingDescription, { color: themeColors.secondaryText }]}>
              Chat behavior and generation settings
            </Text>
          </View>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={themeColors.secondaryText}
        />
      </TouchableOpacity>
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  advancedTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'center',
  },
  advancedTagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    marginHorizontal: 16,
  },
});

export default ModelSettingsSection;
