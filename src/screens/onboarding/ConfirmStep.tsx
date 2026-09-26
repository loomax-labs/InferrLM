import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';
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
  const totalBytes = models.reduce((sum, m) => sum + getModelDownloadSizeBytes(m), 0);

  if (models.length === 0) {
    return (
      <View>
        <Text style={[styles.body, { color: colors.text }]}>
          {expertise === 'new'
            ? 'No file selected. You can download one later from the Models tab.'
            : 'No models selected. You can download from the Models tab when you are ready.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.gap}>
      <Text style={[styles.body, { color: colors.text }]}>
        {expertise === 'new'
          ? 'These files are not made by us. They can say harmful or wrong things. Only continue if you understand that.'
          : 'These models are not ours. They may generate harmful, biased, or inappropriate content. Use responsibly.'}
      </Text>
      <Text style={{ color: colors.text, fontWeight: '600' }}>
        Total download: {formatBytes(totalBytes)}
      </Text>
      {models.map((model) => (
        <Text key={model.name} style={{ color: colors.textSecondary }}>
          {model.name}
        </Text>
      ))}
      {!storageOk && storageMessage ? (
        <Text style={{ color: colors.primary, marginTop: 8 }}>{storageMessage}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 10 },
  body: { fontSize: 16, lineHeight: 24 },
});
