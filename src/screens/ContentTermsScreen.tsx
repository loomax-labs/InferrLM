import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../constants/theme';
import { GradientBg } from '../services/adapters/GradientBgAdapter';
import AppHeader from '../components/AppHeader';
import { useT } from '../i18n';

// REVIEW: counsel has not approved translations.


interface TermsSection {
  title: string;
  body: string;
}

const ContentTermsScreen = () => {
  const t = useT();
  const router = useRouter();
  const sections: TermsSection[] = [
    {
      title: t('terms.generatedTitle'),
      body: t('terms.generatedBody'),
    },
    {
      title: t('terms.disclaimersTitle'),
      body: t('terms.disclaimersBody'),
    },
    {
      title: t('terms.safetyTitle'),
      body: t('terms.safetyBody'),
    },
    {
      title: t('terms.legalTitle'),
      body: t('terms.legalBody'),
    },
  ];
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];

  const renderSection = (section: TermsSection, index: number) => (
    <View
      key={index}
      style={[
        styles.sectionItem,
        { borderBottomColor: themeColors.borderColor },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
        {section.title}
      </Text>
      <Text style={[styles.sectionBody, { color: themeColors.secondaryText }]}>
        {section.body}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <GradientBg />
      <AppHeader
        title={t('terms.title')}
        leftComponent={
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={Platform.OS === 'ios' && currentTheme === 'light' ? themeColors.primary : themeColors.headerText} />
          </TouchableOpacity>
        }
        rightButtons={[]}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionsContainer}>
          {sections.map((section, index) => renderSection(section, index))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionsContainer: {
    gap: 16,
  },
  sectionItem: {
    borderRadius: 12,
    padding: 16,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 22,
  },
});

export default ContentTermsScreen;
