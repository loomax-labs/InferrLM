import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { AssistantDeployment } from '../../types/assistant';

type Props = {
  value: AssistantDeployment;
  onChange: (value: AssistantDeployment) => void;
  cloudEnabled: boolean;
  themeColors: {
    text: string;
    secondaryText: string;
    cardBackground: string;
    primary: string;
  };
};

export default function AssistantDeploymentToggle({
  value,
  onChange,
  cloudEnabled,
  themeColors,
}: Props) {
  return (
    <View>
      <Text style={[styles.label, { color: themeColors.secondaryText }]}>Storage</Text>
      <View style={[styles.row, { backgroundColor: themeColors.cardBackground }]}>
        <ToggleChip
          label="This device"
          active={value === 'local'}
          onPress={() => onChange('local')}
          themeColors={themeColors}
        />
        <ToggleChip
          label="Account"
          active={value === 'cloud'}
          disabled={!cloudEnabled}
          onPress={() => onChange('cloud')}
          themeColors={themeColors}
        />
      </View>
      {!cloudEnabled ? (
        <Text style={[styles.hint, { color: themeColors.secondaryText }]}>
          Sign in to sync an assistant to your InferrLM account. Secrets for skills stay on each device.
        </Text>
      ) : (
        <Text style={[styles.hint, { color: themeColors.secondaryText }]}>
          Account copies sync across devices. Skill packages must still be installed locally.
        </Text>
      )}
    </View>
  );
}

function ToggleChip({
  label,
  active,
  disabled,
  onPress,
  themeColors,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
  themeColors: Props['themeColors'];
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.chip,
        active ? { backgroundColor: themeColors.primary } : null,
        disabled ? styles.chipDisabled : null,
      ]}
    >
      <Text
        style={[
          styles.chipText,
          { color: active ? '#fff' : themeColors.text },
          disabled ? { color: themeColors.secondaryText } : null,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginTop: 14,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    gap: 6,
  },
  chip: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  chipDisabled: {
    opacity: 0.45,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
});
