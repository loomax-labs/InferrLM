import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../constants/theme';
import { GradientBg } from '../services/adapters/GradientBgAdapter';
import AppHeader from '../components/AppHeader';

interface License {
  name: string;
  description: string;
  licenseType: string;
  licenseUrl?: string;
  repositoryUrl?: string;
}

const licenses: License[] = [
  {
    name: 'react-native-paper',
    description: 'Material Design for React Native',
    licenseType: 'MIT License',
    licenseUrl: 'https://github.com/callstack/react-native-paper/blob/main/LICENSE.md',
    repositoryUrl: 'https://github.com/callstack/react-native-paper'
  },
  {
    name: 'llama.rn',
    description: 'Llama.cpp inference engine binding for React Native',
    licenseType: 'MIT License',
    licenseUrl: 'https://github.com/mybigday/llama.rn/blob/master/LICENSE',
    repositoryUrl: 'https://github.com/mybigday/llama.rn'
  },
  {
    name: 'react-native-nitro-mlx',
    description: 'MLX on-device inference for React Native via Nitro Modules',
    licenseType: 'MIT License',
    licenseUrl: 'https://github.com/corasan/react-native-nitro-mlx/blob/main/LICENSE',
    repositoryUrl: 'https://github.com/corasan/react-native-nitro-mlx'
  },
  {
    name: 'react-native-nitro-markdown',
    description: 'High-performance Markdown renderer for React Native',
    licenseType: 'MIT License',
    licenseUrl: 'https://github.com/JoaoPauloCMarra/react-native-nitro-markdown/blob/main/LICENSE',
    repositoryUrl: 'https://github.com/JoaoPauloCMarra/react-native-nitro-markdown'
  },
  {
    name: 'react-native-nitro-modules',
    description: 'Fast native modules bridge for React Native',
    licenseType: 'MIT License',
    licenseUrl: 'https://github.com/mrousavy/nitro/blob/main/LICENSE',
    repositoryUrl: 'https://github.com/mrousavy/nitro'
  },
  {
    name: 'react-native-rag',
    description: 'Retrieval-Augmented Generation for React Native',
    licenseType: 'MIT License',
    licenseUrl: 'https://github.com/software-mansion-labs/react-native-rag/blob/main/LICENSE',
    repositoryUrl: 'https://github.com/software-mansion-labs/react-native-rag'
  },
  {
    name: '@react-native-ai/apple',
    description: 'Apple Intelligence SDK for React Native',
    licenseType: 'MIT License',
    licenseUrl: 'https://github.com/callstackincubator/ai/blob/main/LICENSE',
    repositoryUrl: 'https://github.com/callstackincubator/ai'
  },
  {
    name: '@react-native-ml-kit/text-recognition',
    description: 'Google ML Kit text recognition for React Native',
    licenseType: 'MIT License',
    licenseUrl: 'https://github.com/a7medev/react-native-ml-kit/blob/main/LICENSE',
    repositoryUrl: 'https://github.com/a7medev/react-native-ml-kit'
  },
  {
    name: 'react-native-code-highlighter',
    description: 'Syntax highlighting component for React Native',
    licenseType: 'MIT License',
    licenseUrl: 'https://github.com/gmsgowtham/react-native-code-highlighter/blob/main/LICENSE',
    repositoryUrl: 'https://github.com/gmsgowtham/react-native-code-highlighter'
  },
  {
    name: 'react-native-pdf-renderer',
    description: 'Native PDF rendering for React Native',
    licenseType: 'MIT License',
    licenseUrl: 'https://github.com/douglasjunior/react-native-pdf-renderer/blob/main/LICENSE',
    repositoryUrl: 'https://github.com/douglasjunior/react-native-pdf-renderer'
  },
  {
    name: 'react-native-qrcode-styled',
    description: 'Customizable QR code generator for React Native',
    licenseType: 'MIT License',
    licenseUrl: 'https://github.com/tokkozhin/react-native-qrcode-styled/blob/main/LICENSE',
    repositoryUrl: 'https://github.com/tokkozhin/react-native-qrcode-styled'
  },
  {
    name: 'react-native-tcp-socket',
    description: 'TCP/IP socket API for React Native',
    licenseType: 'MIT License',
    licenseUrl: 'https://github.com/Rapsssito/react-native-tcp-socket/blob/master/LICENSE',
    repositoryUrl: 'https://github.com/Rapsssito/react-native-tcp-socket'
  },
  {
    name: 'react-native-get-random-values',
    description: 'Polyfill for crypto.getRandomValues for React Native',
    licenseType: 'MIT License',
    licenseUrl: 'https://github.com/LinusU/react-native-get-random-values/blob/master/LICENSE',
    repositoryUrl: 'https://github.com/LinusU/react-native-get-random-values'
  },
  {
    name: '@react-native-menu/menu',
    description: 'Native context menu and dropdown menu for React Native',
    licenseType: 'MIT License',
    licenseUrl: 'https://github.com/react-native-menu/menu/blob/master/LICENSE',
    repositoryUrl: 'https://github.com/react-native-menu/menu'
  },
  {
    name: 'react-native-svg',
    description: 'SVG library for React Native',
    licenseType: 'MIT License',
    licenseUrl: 'https://github.com/software-mansion/react-native-svg/blob/main/LICENSE',
    repositoryUrl: 'https://github.com/software-mansion/react-native-svg'
  },
  {
    name: 'react-native-webview',
    description: 'WebView component for React Native',
    licenseType: 'MIT License',
    licenseUrl: 'https://github.com/react-native-webview/react-native-webview/blob/master/LICENSE',
    repositoryUrl: 'https://github.com/react-native-webview/react-native-webview'
  },
  {
    name: '@op-engineering/op-sqlite',
    description: 'Fast SQLite implementation for React Native',
    licenseType: 'MIT License',
    licenseUrl: 'https://github.com/OP-Engineering/op-sqlite/blob/main/LICENSE',
    repositoryUrl: 'https://github.com/OP-Engineering/op-sqlite'
  },
  {
    name: '@react-native-google-signin/google-signin',
    description: 'Google Sign-In for React Native',
    licenseType: 'MIT License',
    licenseUrl: 'https://github.com/react-native-google-signin/google-signin/blob/master/LICENSE',
    repositoryUrl: 'https://github.com/react-native-google-signin/google-signin'
  },
  {
    name: 'react-native-in-app-review',
    description: 'Native in-app review functionality',
    licenseType: 'MIT License',
    licenseUrl: 'https://github.com/MinaSamir11/react-native-in-app-review/blob/master/LICENSE',
    repositoryUrl: 'https://github.com/MinaSamir11/react-native-in-app-review'
  },
  {
    name: '@react-native-community/slider',
    description: 'Slider component for React Native',
    licenseType: 'MIT License',
    licenseUrl: 'https://github.com/callstack/react-native-slider/blob/main/LICENSE.md',
    repositoryUrl: 'https://github.com/callstack/react-native-slider'
  },
  {
    name: 'eventemitter3',
    description: 'High performance event emitter',
    licenseType: 'MIT License',
    licenseUrl: 'https://github.com/primus/eventemitter3/blob/master/LICENSE',
    repositoryUrl: 'https://github.com/primus/eventemitter3'
  }
];

const LicensesScreen = () => {
  const router = useRouter();
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];

  const openUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
    }
  };

  const renderLicenseItem = (license: License, index: number) => (
    <View 
      key={index} 
      style={[
        styles.licenseItem, 
        { 
          backgroundColor: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#f8f8f8',
          borderBottomColor: themeColors.borderColor 
        }
      ]}
    >
      <View style={styles.licenseHeader}>
        <Text style={[styles.licenseName, { color: themeColors.text }]}>
          {license.name}
        </Text>
      </View>
      
      <Text style={[styles.licenseDescription, { color: themeColors.secondaryText }]}>
        {license.description}
      </Text>
      
      <View style={styles.licenseLinks}>
        <View style={[styles.licenseTypeContainer, { backgroundColor: themeColors.primary + '20' }]}>
          <Text style={[styles.licenseType, { color: themeColors.primary }]}>
            {license.licenseType}
          </Text>
        </View>
        
        <View style={styles.linkButtons}>
          {license.licenseUrl && (
            <TouchableOpacity
              style={[styles.linkButton, { backgroundColor: themeColors.borderColor }]}
              onPress={() => openUrl(license.licenseUrl!)}
            >
              <MaterialCommunityIcons name="file-document-outline" size={16} color={themeColors.text} />
              <Text style={[styles.linkButtonText, { color: themeColors.text }]}>License</Text>
            </TouchableOpacity>
          )}
          
          {license.repositoryUrl && (
            <TouchableOpacity
              style={[styles.linkButton, { backgroundColor: themeColors.borderColor }]}
              onPress={() => openUrl(license.repositoryUrl!)}
            >
              <MaterialCommunityIcons name="github" size={16} color={themeColors.text} />
              <Text style={[styles.linkButtonText, { color: themeColors.text }]}>Repository</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <GradientBg />
      <AppHeader 
        title="Open Source Licenses" 
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

        <View style={styles.licensesContainer}>
          {licenses.map((license, index) => renderLicenseItem(license, index))}
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
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  licensesContainer: {
    gap: 16,
  },
  licenseItem: {
    borderRadius: 12,
    padding: 16,
    borderBottomWidth: 1,
  },
  licenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  licenseName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  licenseVersion: {
    fontSize: 14,
    fontWeight: '500',
  },
  licenseDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  licenseLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  licenseTypeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  licenseType: {
    fontSize: 12,
    fontWeight: '600',
  },
  linkButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  linkButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  footerSection: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
});

export default LicensesScreen;
