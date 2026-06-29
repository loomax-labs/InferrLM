import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { theme } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import type { SkillActivityStep } from '../../types/skillActivity';

type SkillProgressPanelProps = {
  steps: SkillActivityStep[];
};

export default function SkillProgressPanel({ steps }: SkillProgressPanelProps) {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const [expanded, setExpanded] = useState(false);

  if (steps.length === 0) {
    return null;
  }

  const head = steps[steps.length - 1];
  const busy = steps.some(step => step.inProgress);

  return (
    <View style={[styles.wrap, { backgroundColor: themeColors.cardBackground }]}>
      <TouchableOpacity style={styles.head} onPress={() => setExpanded(v => !v)} activeOpacity={0.8}>
        <View style={styles.iconWrap}>
          {busy ? (
            <ActivityIndicator size="small" color={themeColors.primary} />
          ) : (
            <MaterialCommunityIcons name="lightning-bolt-outline" size={18} color={themeColors.primary} />
          )}
        </View>
        <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={2}>
          {head.title}
        </Text>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={themeColors.secondaryText}
        />
      </TouchableOpacity>

      {expanded ? (
        <View style={styles.body}>
          {steps.map(step => (
            <View key={step.id} style={styles.row}>
              <View style={styles.rowIcon}>
                {step.inProgress ? (
                  <ActivityIndicator size="small" color={themeColors.secondaryText} />
                ) : (
                  <MaterialCommunityIcons name="check" size={16} color={themeColors.primary} />
                )}
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: themeColors.text }]}>{step.title}</Text>
                {step.detail ? (
                  <Text style={[styles.rowDetail, { color: themeColors.secondaryText }]} numberOfLines={4}>
                    {step.detail}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  iconWrap: {
    width: 22,
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  body: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  rowIcon: {
    width: 20,
    paddingTop: 2,
    alignItems: 'center',
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  rowDetail: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
  },
  rowText: {
    flex: 1,
  },
});
