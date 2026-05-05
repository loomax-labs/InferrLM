import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';

import AppHeader from '../components/AppHeader';
import { theme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../types/navigation';
import LabsTasksSection from '../components/settings/LabsTasksSection';

export default function BenchmarkScreen() {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <AppHeader title="Tools" showBackButton={false} showLogo={false} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LabsTasksSection
          onOpenPromptLab={() => navigation.navigate('PromptLab')}
          onOpenSkillManager={() => navigation.navigate('SkillManager')}
          onOpenAudioScribe={() => navigation.navigate('AudioScribe')}
          onOpenMobileActions={() => navigation.navigate('MobileActions')}
          onOpenTinyGarden={() => navigation.navigate('TinyGarden')}
          onOpenBenchmark={() => navigation.navigate('Benchmark')}
          onOpenServer={() => navigation.navigate('LocalServer')}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingTop: 20 },
});
