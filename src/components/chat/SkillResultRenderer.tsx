import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { theme } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import type { SkillResult } from '../../types/skill';

type SkillResultRendererProps = {
  result: SkillResult;
};

export default function SkillResultRenderer({ result }: SkillResultRendererProps) {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const imageUri = result.image ? `data:${result.image.mimeType};base64,${result.image.base64}` : null;

  return (
    <View style={[styles.card, { borderColor: themeColors.secondaryText + '20', backgroundColor: themeColors.borderColor }]}> 
      {result.error ? <Text style={styles.errorText}>{result.error}</Text> : null}
      {result.result ? <Text style={[styles.resultText, { color: themeColors.text }]}>{result.result}</Text> : null}
      {imageUri ? <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" /> : null}
      {result.webview?.url ? (
        <View style={styles.webviewWrap}>
          <WebView source={{ uri: result.webview.url }} style={styles.webview} />
        </View>
      ) : null}
      {!result.error && !result.result && !result.image && !result.webview ? (
        <Text style={[styles.emptyText, { color: themeColors.secondaryText }]}>No preview output.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  errorText: {
    color: '#C62828',
    fontSize: 13,
    fontWeight: '700',
  },
  resultText: {
    fontSize: 14,
    lineHeight: 21,
  },
  emptyText: {
    fontSize: 13,
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: 10,
  },
  webviewWrap: {
    height: 220,
    overflow: 'hidden',
    borderRadius: 10,
  },
  webview: {
    flex: 1,
  },
});