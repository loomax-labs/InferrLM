import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';

type ThemeOptionProps = {
  title: string;
  description?: string;
  value: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onSelect: (value: string) => void;
  selectedTheme: string;
  showDivider?: boolean;
};

const ThemeOption = ({ 
  title, 
  description, 
  value, 
  icon, 
  onSelect, 
  selectedTheme,
  showDivider = false,
}: ThemeOptionProps) => {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const iconColor = currentTheme === 'dark' ? '#FFFFFF' : themeColors.primary;

  return (
    <TouchableOpacity 
      style={[
        styles.settingItem,
        showDivider && styles.settingItemBorder
      ]}
      onPress={() => onSelect(value)}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : themeColors.primary + '20' }]}>
          <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingText, { color: themeColors.text }]}>
            {title}
          </Text>
          {description ? (
            <Text style={[styles.settingDescription, { color: themeColors.secondaryText }]}>
              {description}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={[
        styles.radioButton,
        { borderColor: themeColors.primary },
        selectedTheme === value && styles.radioButtonSelected,
        selectedTheme === value && { borderColor: themeColors.primary, backgroundColor: themeColors.primary }
      ]}>
        {selectedTheme === value && (
          <View style={[styles.radioButtonInner, { backgroundColor: '#fff' }]} />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingItemBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
    flexShrink: 1,
  },
  settingDescription: {
    fontSize: 13,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderWidth: 0,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default ThemeOption; 
