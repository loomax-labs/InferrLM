import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from '../components/AppHeader';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../constants/theme';
import { useRemoteModel } from '../context/RemoteModelContext';
import { deleteAccount } from '../services/AuthService';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'DeleteAccount'>;

export default function DeleteAccountScreen({ navigation }: Props) {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const insets = useSafeAreaInsets();
  const { checkLoginStatus } = useRemoteModel();
  const [keyword, setKeyword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const isReady = keyword === 'DELETE';

  const handleDelete = async () => {
    if (!isReady || isDeleting) return;

    setIsDeleting(true);
    setError('');

    try {
      const result = await deleteAccount(keyword);
      if (!result.success) {
        setError(result.error || 'Account deletion failed. Please try again.');
        return;
      }

      await checkLoginStatus();
      navigation.replace('DeleteAccountDone');
    } catch {
      setError('Account deletion failed. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
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
            <Text style={[styles.subtitle, { color: themeColors.secondaryText }]}>This will sign you out immediately, disable your account now, and permanently remove your data after 30 days.</Text>
          </View>

          <View style={[styles.section, { backgroundColor: themeColors.background }]}> 
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Before you continue</Text>
            <View style={styles.pointRow}>
              <MaterialCommunityIcons name="check-circle-outline" size={18} color="#FF5252" />
              <Text style={[styles.pointText, { color: themeColors.secondaryText }]}>You will lose access to your account immediately.</Text>
            </View>
            <View style={styles.pointRow}>
              <MaterialCommunityIcons name="check-circle-outline" size={18} color="#FF5252" />
              <Text style={[styles.pointText, { color: themeColors.secondaryText }]}>Your account can only be restored by support during the 30-day hold period.</Text>
            </View>
            <View style={styles.pointRow}>
              <MaterialCommunityIcons name="check-circle-outline" size={18} color="#FF5252" />
              <Text style={[styles.pointText, { color: themeColors.secondaryText }]}>After 30 days, the deletion becomes permanent.</Text>
            </View>
          </View>

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
              editable={!isDeleting}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: themeColors.borderColor }]}
              onPress={() => navigation.goBack()}
              disabled={isDeleting}
            >
              <Text style={[styles.secondaryButtonText, { color: themeColors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: isReady ? '#FF5252' : '#FFB4B4' }]}
              onPress={handleDelete}
              disabled={!isReady || isDeleting}
            >
              {isDeleting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryButtonText}>Delete Account</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
  secondaryButton: {
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 54,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});