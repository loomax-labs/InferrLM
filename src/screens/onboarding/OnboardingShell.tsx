import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';

type OnboardingShellProps = {
  title: string;
  stepIndex: number;
  stepCount: number;
  onBack?: () => void;
  onSkip?: () => void;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  children: React.ReactNode;
};

export function OnboardingShell({
  title,
  stepIndex,
  stepCount,
  onBack,
  onSkip,
  onContinue,
  continueLabel = 'Continue',
  continueDisabled = false,
  secondaryLabel,
  onSecondary,
  children,
}: OnboardingShellProps) {
  const { theme: currentTheme } = useTheme();
  const colors = theme[currentTheme];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { borderBottomColor: colors.borderColor }]}>
          <View style={styles.headerRow}>
            {onBack ? (
              <TouchableOpacity onPress={onBack} style={styles.headerSide}>
                <Text style={{ color: colors.primary }}>Back</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.headerSide} />
            )}
            <Text style={[styles.progress, { color: colors.textSecondary }]}>
              {stepIndex + 1} / {stepCount}
            </Text>
            {onSkip ? (
              <TouchableOpacity onPress={onSkip} style={styles.headerSide}>
                <Text style={[styles.skip, { color: colors.textSecondary }]}>Skip</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.headerSide} />
            )}
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.borderColor, backgroundColor: colors.background }]}>
          {secondaryLabel && onSecondary ? (
            <TouchableOpacity
              onPress={onSecondary}
              style={[styles.secondaryBtn, { backgroundColor: colors.cardBackground }]}
            >
              <Text style={{ color: colors.primary, textAlign: 'center' }}>{secondaryLabel}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={onContinue}
            disabled={continueDisabled}
            style={[
              styles.primaryBtn,
              {
                backgroundColor: continueDisabled ? colors.borderColor : colors.primary,
              },
            ]}
          >
            <Text style={{ color: colors.headerText, textAlign: 'center', fontWeight: '600' }}>
              {continueLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerSide: { minWidth: 56 },
  progress: { fontSize: 13 },
  skip: { fontSize: 15, textAlign: 'right' },
  title: { fontSize: 22, fontWeight: '700' },
  scrollContent: { padding: 20, paddingBottom: 32 },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    gap: 10,
  },
  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 8,
  },
  secondaryBtn: {
    paddingVertical: 12,
    borderRadius: 8,
  },
});
