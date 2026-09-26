import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';
import { OpenSansFont } from '../../hooks/OpenSansFont';
import { DownloadableModel } from '../../components/model/DownloadableModelItem';
import type { ExpertiseLevel } from '../../onboarding/types';
import { getModelDownloadSizeBytes } from '../../onboarding/recommendModels';
import { formatBytes } from '../../utils/storageUtils';

type ConfirmStepProps = {
  expertise: ExpertiseLevel;
  models: DownloadableModel[];
  storageOk: boolean;
  storageMessage?: string;
};

export function ConfirmStep({
  expertise,
  models,
  storageOk,
  storageMessage,
}: ConfirmStepProps) {
  const { theme: currentTheme } = useTheme();
  const colors = theme[currentTheme];
  const { fonts } = OpenSansFont();
  const totalBytes = models.reduce((sum, m) => sum + getModelDownloadSizeBytes(m), 0);

  if (models.length === 0) {
    return (
      <View style={[styles.notice, { backgroundColor: colors.cardBackground }]}>
        <View style={[styles.mark, { backgroundColor: colors.background }]}>
          <MaterialCommunityIcons name="download-off-outline" size={22} color={colors.primary} />
        </View>
        <Text style={[styles.body, fonts.regular, { color: colors.text }]}>
          {expertise === 'new'
            ? 'No file selected. You can download one later from the Models tab.'
            : 'No models selected. You can download from the Models tab when you are ready.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.gap}>
      <View style={[styles.notice, { backgroundColor: colors.cardBackground }]}>
        <View style={[styles.mark, { backgroundColor: colors.background }]}>
          <MaterialCommunityIcons name="alert-circle-outline" size={22} color={colors.primary} />
        </View>
        <Text style={[styles.body, fonts.regular, { color: colors.text }]}>
          {expertise === 'new'
            ? 'These files are not made by us. They can say harmful or wrong things. Only continue if you understand that.'
            : 'These models are not ours. They may generate harmful, biased, or inappropriate content. Use responsibly.'}
        </Text>
      </View>

      <View style={[styles.total, { backgroundColor: colors.primary }]}>
        <Text style={[styles.totalLabel, fonts.medium, { color: colors.headerText }]}>Total download</Text>
        <Text style={[styles.totalValue, fonts.bold, { color: colors.headerText }]}>{formatBytes(totalBytes)}</Text>
      </View>

      <View style={styles.list}>
        {models.map((model) => (
          <View key={model.name} style={[styles.row, { backgroundColor: colors.cardBackground }]}>
            <MaterialCommunityIcons name="cube-outline" size={18} color={colors.primary} />
            <Text style={[styles.rowText, fonts.medium, { color: colors.text }]}>{model.name}</Text>
          </View>
        ))}
      </View>

      {!storageOk && storageMessage ? (
        <View style={[styles.notice, { backgroundColor: colors.cardBackground }]}>
          <MaterialCommunityIcons name="harddisk" size={20} color={colors.primary} />
          <Text style={[styles.body, fonts.regular, { color: colors.text }]}>{storageMessage}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 12 },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 16,
    padding: 14,
  },
  mark: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, fontSize: 15, lineHeight: 22 },
  total: {
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  totalLabel: { fontSize: 13, opacity: 0.85 },
  totalValue: { fontSize: 28, marginTop: 4 },
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowText: { flex: 1, fontSize: 15 },
});
