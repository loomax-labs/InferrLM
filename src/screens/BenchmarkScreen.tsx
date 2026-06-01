import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import AppHeader from '../components/AppHeader';
import { theme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import LabsTasksSection from '../components/settings/LabsTasksSection';

export default function BenchmarkScreen() {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <AppHeader title="Tools" rightButtons={null} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LabsTasksSection
          onOpenPromptLab={() => router.push('/prompt-lab')}
          onOpenSkillManager={() => router.push('/skill-manager')}
          onOpenAudioScribe={() => router.push('/audio-scribe')}
          onOpenMobileActions={() => router.push('/mobile-actions')}
          onOpenBenchmark={() => router.push('/benchmark')}
          onOpenServer={() => router.push('/local-server')}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingTop: 20 },
});
