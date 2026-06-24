import React from 'react';
import { Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';
import ApiKeySection from './ApiKeySection';

export const RemoteModelsTab: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme as 'light' | 'dark'];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? insets.bottom : 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Text style={[styles.sectionTitle, { color: themeColors.text, marginBottom: 16 }]}>
          API Settings for Remote Models
        </Text>
        <ApiKeySection />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
});
