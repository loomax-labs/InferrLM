import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from '../components/AppHeader';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../constants/theme';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'DeleteAccountDone'>;

export default function DeleteAccountDoneScreen({ navigation }: Props) {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const insets = useSafeAreaInsets();

  const handleDone = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'MainTabs', params: { screen: 'SettingsTab' } }],
      })
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}> 
      <AppHeader
        title="Account Deactivated"
        showBackButton={false}
        showLogo={false}
        rightButtons={[]}
      />
      <View style={[styles.content, { paddingBottom: insets.bottom + 24 }]}> 
        <View style={[styles.card, { backgroundColor: themeColors.background }]}> 
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="shield-check-outline" size={42} color="#FF5252" />
          </View>
          <Text style={[styles.title, { color: themeColors.text }]}>Your account is now deactivated</Text>
          <Text style={[styles.message, { color: themeColors.secondaryText }]}>You have been signed out. Your account will stay in a recovery window for 30 days and will be permanently deleted after that.</Text>
          <Text style={[styles.note, { color: themeColors.secondaryText }]}>If you need to restore the account before the deadline, contact support during the hold period.</Text>
        </View>

        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  card: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 14,
  },
  note: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 12,
  },
  doneButton: {
    backgroundColor: '#FF5252',
    borderRadius: 12,
    minHeight: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});