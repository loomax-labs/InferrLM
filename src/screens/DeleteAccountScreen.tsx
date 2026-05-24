import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from '../components/AppHeader';
import Dialog from '../components/Dialog';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../constants/theme';
import { useRemoteModel } from '../context/RemoteModelContext';
import { deleteAccount } from '../services/AuthService';
export default function DeleteAccountScreen() {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const insets = useSafeAreaInsets();
  const { checkLoginStatus } = useRemoteModel();
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [successVisible, setSuccessVisible] = useState(false);

  const normalizedKeyword = keyword.trim();
  const isReady = normalizedKeyword === 'DELETE';

  const formatRetryAt = (value?: string | null) => {
    if (!value) {
      return 'You can delete this account again 48 hours after restoring it.';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'You can delete this account again 48 hours after restoring it.';
    }

    return `You can delete this account again after ${date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })}.`;
  };

  const handleDelete = async () => {
    if (!isReady || isDeleting) return;

    setIsDeleting(true);
    setError('');

    try {
      const result = await deleteAccount(normalizedKeyword);
      if (!result.success) {
        if (
          result.code === 'deletion_restore_cooldown' ||
          result.error?.includes('48-hour grace period')
        ) {
          setError(formatRetryAt(result.deletionCooldown?.retryAt));
          return;
        }
        setError(result.error || 'Account deletion failed. Please try again.');
        return;
      }

      await checkLoginStatus();
      setSuccessVisible(true);
    } catch {
      setError('Account deletion failed. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDone = () => {
    setSuccessVisible(false);
    router.replace('/(tabs)');
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: themeColors.background }]}> 
        <AppHeader
          title="Delete Account"
          showBackButton={true}
          showLogo={false}
          rightButtons={[]}
        />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}> 
            <View style={[styles.heroCard, { backgroundColor: themeColors.background }]}> 
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons name="alert-circle-outline" size={36} color="#FF5252" />
              </View>
              <Text style={[styles.title, { color: themeColors.text }]}>Delete your account</Text>
                <Text style={[styles.subtitle, { color: themeColors.secondaryText }]}>This will sign you out immediately, deactivate your account now, and permanently remove your data after 30 days.</Text>
            </View>

            <View style={[styles.section, { backgroundColor: themeColors.background }]}> 
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Before you continue</Text>
              <View style={styles.pointRow}>
                <MaterialCommunityIcons name="check-circle-outline" size={18} color="#FF5252" />
                <Text style={[styles.pointText, { color: themeColors.secondaryText }]}>You will lose access to your account immediately.</Text>
              </View>
              <View style={styles.pointRow}>
                <MaterialCommunityIcons name="check-circle-outline" size={18} color="#FF5252" />
                <Text style={[styles.pointText, { color: themeColors.secondaryText }]}>You can restore the account by signing in again during the 30-day hold period.</Text>
              </View>
              <View style={styles.pointRow}>
                <MaterialCommunityIcons name="check-circle-outline" size={18} color="#FF5252" />
                <Text style={[styles.pointText, { color: themeColors.secondaryText }]}>After 30 days, the deletion becomes permanent.</Text>
              </View>
            </View>

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={insets.top + 24}
            >
              <View style={[styles.section, { backgroundColor: themeColors.background }]}> 
                <Text style={[styles.label, { color: themeColors.text }]}>Type DELETE to confirm</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: themeColors.text,
                      backgroundColor: themeColors.background,
                      borderColor: error ? '#FF5252' : isReady ? '#FF5252' : themeColors.borderColor,
                    },
                  ]}
                  value={keyword}
                  onChangeText={(value) => {
                    setKeyword(value);
                    if (error) setError('');
                  }}
                  placeholder="Type DELETE"
                  placeholderTextColor={themeColors.secondaryText + '80'}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  caretHidden={true}
                  editable={!isDeleting}
                />
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </View>
            </KeyboardAvoidingView>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.outlineActionButton]}
                onPress={() => router.back()}
                disabled={isDeleting}
              >
                <MaterialCommunityIcons name="arrow-left" size={20} color="#FF5252" />
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.filledActionButton,
                  (!isReady || isDeleting) && styles.actionButtonDisabled,
                ]}
                onPress={handleDelete}
                disabled={!isReady || isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FF5252" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="account-remove" size={20} color="#FF5252" />
                    <Text style={styles.actionButtonText}>Delete Account</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      <Dialog
        visible={successVisible}
        iconName="shield-check-outline"
        title="Account Deactivated"
        description="You have been signed out. Your account will be permanently deleted after the grace period of 30 days."
        primaryButtonText="Done"
        onPrimaryPress={handleDone}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  heroCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 12,
  },
  section: {
    borderRadius: 16,
    padding: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  pointText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  errorText: {
    color: '#FF5252',
    fontSize: 13,
    fontWeight: '500',
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  outlineActionButton: {
    backgroundColor: '#FF525215',
    borderColor: '#FF525230',
    borderWidth: 1,
  },
  filledActionButton: {
    backgroundColor: '#FF525220',
  },
  actionButtonDisabled: {
    opacity: 0.45,
  },
  actionButtonText: {
    color: '#FF5252',
    fontSize: 16,
    fontWeight: '600',
  },
});