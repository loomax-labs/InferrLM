import React from 'react';
import { ScrollView, StyleSheet, View, Platform, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import AppHeader from '../components/AppHeader';
import { theme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useRemoteModel } from '../context/RemoteModelContext';
import LabsTasksSection from '../components/settings/LabsTasksSection';

export default function BenchmarkScreen() {
  const insets = useSafeAreaInsets();
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const router = useRouter();
  const { isLoggedIn } = useRemoteModel();

  const profileButton = (
    <TouchableOpacity
      style={styles.headerButton}
      onPress={() => {
        if (isLoggedIn) {
          router.push('/profile');
        } else {
          router.push({ pathname: '/login', params: { redirectTo: '/(tabs)/tools' } });
        }
      }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <MaterialCommunityIcons
        name={isLoggedIn ? 'account-circle' : 'login'}
        size={22}
        color={Platform.OS === 'ios' && currentTheme === 'light' ? themeColors.primary : themeColors.headerText}
      />
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <AppHeader title="Tools" rightButtons={profileButton} />
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, Platform.OS === 'ios' && { paddingBottom: insets.bottom }]} showsVerticalScrollIndicator={false}>
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
  headerButton: {
    width: Platform.OS === 'ios' ? 44 : 36,
    height: Platform.OS === 'ios' ? 44 : 36,
    borderRadius: Platform.OS === 'ios' ? 0 : 18,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
