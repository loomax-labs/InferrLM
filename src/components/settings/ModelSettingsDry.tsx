import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';
import SettingSlider from '../SettingSlider';

type ModelSettings = {
  dryMultiplier: number;
  dryBase: number;
  dryAllowedLength: number;
  dryPenaltyLastN: number;
  drySequenceBreakers: string[];
};

type ModelSettingsDryProps = {
  modelSettings: ModelSettings;
  defaultSettings: Partial<ModelSettings>;
  onSettingsChange: (settings: Partial<ModelSettings>) => void;
  onDialogOpen: (config: any) => void;
  onDrySequenceBreakersDialogOpen: () => void;
  showMlxWarning?: boolean;
};

const isArrayDifferent = (current: any[] | undefined, defaultValue: any[] | undefined): boolean => {
  const currArray = current || [];
  const defArray = defaultValue || [];
  return currArray.length !== defArray.length || 
         !currArray.every((item, index) => item === defArray[index]);
};

const ModelSettingsDry = ({
  modelSettings,
  defaultSettings,
  onSettingsChange,
  onDialogOpen,
  onDrySequenceBreakersDialogOpen,
  showMlxWarning,
}: ModelSettingsDryProps) => {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const iconColor = currentTheme === 'dark' ? '#FFFFFF' : themeColors.primary;

  return (
    <>
      <View style={[styles.sectionHeader, { borderTopColor: 'rgba(150, 150, 150, 0.1)' }]}>
        <Text style={[styles.sectionTitle, { color: themeColors.secondaryText }]}>DRY (DON'T REPEAT YOURSELF)</Text>
      </View>

      <SettingSlider
        label="DRY Multiplier"
        value={modelSettings.dryMultiplier ?? 0}
        defaultValue={defaultSettings.dryMultiplier ?? 0}
        onValueChange={(value) => onSettingsChange({ dryMultiplier: value })}
        minimumValue={0}
        maximumValue={5}
        step={0.1}
        description="Strength of DRY feature. Higher values strongly prevent repetition. 0 disables DRY."
        warningText={showMlxWarning ? 'Unsupported on MLX' : undefined}
        onPressChange={() => onDialogOpen({
          key: 'dryMultiplier',
          label: 'DRY Multiplier',
          value: modelSettings.dryMultiplier ?? 0,
          minimumValue: 0,
          maximumValue: 5,
          step: 0.1,
          description: "Strength of DRY feature. Higher values strongly prevent repetition. 0 disables DRY."
        })}
      />

      <SettingSlider
        label="DRY Base"
        value={modelSettings.dryBase ?? 1.75}
        defaultValue={defaultSettings.dryBase ?? 1.75}
        onValueChange={(value) => onSettingsChange({ dryBase: value })}
        minimumValue={1}
        maximumValue={4}
        step={0.05}
        description="Base penalty for repetition in DRY mode. Higher values are more aggressive."
        warningText={showMlxWarning ? 'Unsupported on MLX' : undefined}
        onPressChange={() => onDialogOpen({
          key: 'dryBase',
          label: 'DRY Base',
          value: modelSettings.dryBase ?? 1.75,
          minimumValue: 1,
          maximumValue: 4,
          step: 0.05,
          description: "Base penalty for repetition in DRY mode. Higher values are more aggressive."
        })}
      />

      <SettingSlider
        label="DRY Allowed Length"
        value={modelSettings.dryAllowedLength ?? 2}
        defaultValue={defaultSettings.dryAllowedLength ?? 2}
        onValueChange={(value) => onSettingsChange({ dryAllowedLength: Math.round(value) })}
        minimumValue={1}
        maximumValue={20}
        step={1}
        description="How many words can repeat before DRY penalty kicks in."
        warningText={showMlxWarning ? 'Unsupported on MLX' : undefined}
        onPressChange={() => onDialogOpen({
          key: 'dryAllowedLength',
          label: 'DRY Allowed Length',
          value: modelSettings.dryAllowedLength ?? 2,
          minimumValue: 1,
          maximumValue: 20,
          step: 1,
          description: "How many words can repeat before DRY penalty kicks in."
        })}
      />

      <SettingSlider
        label="DRY Penalty Last N"
        value={modelSettings.dryPenaltyLastN ?? -1}
        defaultValue={defaultSettings.dryPenaltyLastN ?? -1}
        onValueChange={(value) => onSettingsChange({ dryPenaltyLastN: Math.round(value) })}
        minimumValue={-1}
        maximumValue={512}
        step={1}
        description="How far back to look for repetition in DRY mode. -1 uses context size."
        warningText={showMlxWarning ? 'Unsupported on MLX' : undefined}
        onPressChange={() => onDialogOpen({
          key: 'dryPenaltyLastN',
          label: 'DRY Penalty Last N',
          value: modelSettings.dryPenaltyLastN ?? -1,
          minimumValue: -1,
          maximumValue: 512,
          step: 1,
          description: "How far back to look for repetition in DRY mode. -1 uses context size."
        })}
      />

      <TouchableOpacity 
        style={[styles.settingItem, styles.settingItemBorder]}
        onPress={onDrySequenceBreakersDialogOpen}
      >
        <View style={styles.settingLeft}>
          <View style={[styles.iconContainer, { backgroundColor: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : themeColors.primary + '20' }]}>
            <MaterialCommunityIcons name="format-list-bulleted" size={22} color={iconColor} />
          </View>
          <View style={styles.settingTextContainer}>
            <View style={styles.labelRow}>
              <Text style={[styles.settingText, { color: themeColors.text }]}>
                DRY Sequence Breakers
              </Text>
              <Text style={[styles.valueText, { color: themeColors.text }]}>
                {modelSettings.drySequenceBreakers?.length || 0}
              </Text>
            </View>
            <Text style={[styles.settingDescription, { color: themeColors.secondaryText }]}>
              Symbols that reset the repetition checker in DRY mode.
            </Text>
            {showMlxWarning && (
              <Text style={styles.unsupportedText}>Unsupported on MLX</Text>
            )}
            {isArrayDifferent(modelSettings.drySequenceBreakers, defaultSettings.drySequenceBreakers) && (
              <TouchableOpacity
                onPress={() => onSettingsChange({ drySequenceBreakers: defaultSettings.drySequenceBreakers || [] })}
                style={[styles.resetButton, { backgroundColor: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : themeColors.primary + '20' }]}
              >
                <MaterialCommunityIcons name="refresh" size={14} color={iconColor} />
                <Text style={[styles.resetText, { color: iconColor }]}>Reset to Default</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={themeColors.secondaryText} />
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  valueText: {
    fontSize: 16,
    fontWeight: '500',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    padding: 4,
    borderRadius: 4,
  },
  resetText: {
    fontSize: 12,
    fontWeight: '500',
  },
  unsupportedText: {
    fontSize: 11,
    color: '#FF9500',
    fontWeight: '500',
    marginTop: 4,
  },
});

export default ModelSettingsDry;
