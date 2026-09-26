import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';
import { OpenSansFont } from '../../hooks/OpenSansFont';
import { useT } from '../../i18n';

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
  continueLabel,
  continueDisabled = false,
  secondaryLabel,
  onSecondary,
  children,
}: OnboardingShellProps) {
  const t = useT();
  const continueText = continueLabel ?? t('onboarding.continue');
  const { theme: currentTheme } = useTheme();
  const colors = theme[currentTheme];
  const { fonts } = OpenSansFont();
  const opacity = useRef(new Animated.Value(0)).current;
  const shift = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    opacity.setValue(0);
    shift.setValue(14);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(shift, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [stepIndex, opacity, shift]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            {onBack ? (
              <TouchableOpacity
                onPress={onBack}
                style={[styles.iconBtn, { backgroundColor: colors.cardBackground }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="chevron-left" size={22} color={colors.text} />
              </TouchableOpacity>
            ) : (
              <View style={styles.iconBtn} />
            )}
            {onSkip ? (
              <TouchableOpacity
                onPress={onSkip}
                style={[styles.skipPill, { backgroundColor: colors.cardBackground }]}
              >
                <Text style={[styles.skip, fonts.medium, { color: colors.textSecondary }]}>
                  {t('onboarding.skip')}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.iconBtn} />
            )}
          </View>
          <View style={styles.track}>
            {Array.from({ length: Math.max(stepCount, 1) }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.segment,
                  {
                    backgroundColor: index <= stepIndex ? colors.primary : colors.cardBackground,
                  },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.title, fonts.bold, { color: colors.text }]}>{title}</Text>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity, transform: [{ translateY: shift }] }}>
            {children}
          </Animated.View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.cardBackground }]}>
          {secondaryLabel && onSecondary ? (
            <TouchableOpacity
              onPress={onSecondary}
              style={[styles.secondaryBtn, { backgroundColor: colors.background }]}
            >
              <Text style={[fonts.semibold, { color: colors.primary, textAlign: 'center' }]}>
                {secondaryLabel}
              </Text>
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
            <Text style={[fonts.semibold, { color: colors.headerText, textAlign: 'center', fontSize: 16 }]}>
              {continueText}
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
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipPill: {
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skip: { fontSize: 14 },
  track: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 18,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  title: { fontSize: 28, lineHeight: 34 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 10,
  },
  primaryBtn: {
    paddingVertical: 16,
    borderRadius: 16,
  },
  secondaryBtn: {
    paddingVertical: 14,
    borderRadius: 16,
  },
});
