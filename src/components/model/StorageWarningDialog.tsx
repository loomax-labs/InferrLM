import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text as PaperText } from 'react-native-paper';
import Dialog from '../Dialog';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';
import { getThemeAwareColor } from '../../utils/ColorUtils';
import { useT } from '../../i18n';

interface StorageWarningDialogProps {
  visible: boolean;
  onAccept: (dontShowAgain: boolean) => void;
  onCancel: () => void;
}

export const StorageWarningDialog: React.FC<StorageWarningDialogProps> = ({
  visible,
  onAccept,
  onCancel
}) => {
  const t = useT();
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme as 'light' | 'dark'];
  const [dontShowAgain, setDontShowAgain] = useState(false);

  return (
    <Dialog 
      visible={visible} 
      onDismiss={onCancel}
      primaryButtonText={t('common.continue')}
      onPrimaryPress={() => onAccept(dontShowAgain)}
      secondaryButtonText={t('common.cancel')}
      onSecondaryPress={onCancel}
      style={{
        zIndex: 10000,
        elevation: 10000
      }}
    >
        <Dialog.Title>{t('models.fileManagerTitle')}</Dialog.Title>
        <Dialog.Content>
          <PaperText variant="bodyMedium" style={{ marginBottom: 16 }}>
            {t('models.fileManagerBody')}
          </PaperText>
          
          <TouchableOpacity 
            style={styles.checkboxContainer}
            onPress={() => setDontShowAgain(!dontShowAgain)}
          >
            <View style={[
              styles.checkboxSquare,
              { 
                borderColor: getThemeAwareColor('#4a0660', currentTheme),
                backgroundColor: dontShowAgain ? getThemeAwareColor('#4a0660', currentTheme) : 'transparent'
              }
            ]}>
              {dontShowAgain && (
                <MaterialCommunityIcons 
                  name="check" 
                  size={16} 
                  color="white" 
                />
              )}
            </View>
            <PaperText style={[styles.checkboxText, { color: themeColors.text }]}>
              {t('models.dontShowAgain')}
            </PaperText>
          </TouchableOpacity>
        </Dialog.Content>
      </Dialog>
  );
};

const styles = StyleSheet.create({
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 6,
  },
  checkboxSquare: {
    width: 20,
    height: 20,
    borderRadius: 3,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxText: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
});
