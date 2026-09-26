import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Dialog from '../Dialog';
import { useTheme } from '../../context/ThemeContext';
import { useT } from '../../i18n';

// REVIEW: counsel has not approved translations.

interface AITermsDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onAccept: () => void;
}

const AITermsDialog: React.FC<AITermsDialogProps> = ({
  visible,
  onDismiss,
  onAccept
}) => {
  const t = useT();
  const { theme: currentTheme } = useTheme();

  return (
    <Dialog
      visible={visible}
      onDismiss={onDismiss}
      style={{
        backgroundColor: currentTheme === 'dark' ? '#1E1E1E' : '#FFFFFF',
        maxHeight: '80%'
      }}
      primaryButtonText={t('chat.aiTermsAccept')}
      onPrimaryPress={onAccept}
      secondaryButtonText={t('common.cancel')}
      onSecondaryPress={onDismiss}
    >
        <Dialog.Title style={{ 
          color: currentTheme === 'dark' ? '#FFFFFF' : '#000000',
          textAlign: 'center'
        }}>
          {t('chat.aiTermsTitle')}
        </Dialog.Title>
        
        <Dialog.Content>
          <ScrollView style={styles.scrollContainer}>
            <View style={styles.section}>
              <Text style={[
                styles.sectionTitle,
                { color: currentTheme === 'dark' ? '#FFFFFF' : '#000000' }
              ]}>
                {t('terms.intro')}{'\n \n'}
                {t('terms.generatedLead')}
              </Text>
              <Text style={[
                styles.sectionText,
                { color: currentTheme === 'dark' ? '#CCCCCC' : '#666666' }
              ]}>
                {t('terms.generatedDetail')}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={[
                styles.sectionTitle,
                { color: currentTheme === 'dark' ? '#FFFFFF' : '#000000' }
              ]}>
                {t('terms.disclaimersTitle')}
              </Text>
              <Text style={[
                styles.sectionText,
                { color: currentTheme === 'dark' ? '#CCCCCC' : '#666666' }
              ]}>
                {t('terms.disclaimersBody')}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={[
                styles.sectionTitle,
                { color: currentTheme === 'dark' ? '#FFFFFF' : '#000000' }
              ]}>
                {t('terms.safetyTitle')}
              </Text>
              <Text style={[
                styles.sectionText,
                { color: currentTheme === 'dark' ? '#CCCCCC' : '#666666' }
              ]}>
                {t('terms.safetyBody')}
              </Text>
            </View>

      
          </ScrollView>
        </Dialog.Content>
    </Dialog>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    maxHeight: 400,
  },
  section: {
    flexDirection: 'column',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionIcon: {
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 22,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'left',
  },
  actions: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
});

export default AITermsDialog;
