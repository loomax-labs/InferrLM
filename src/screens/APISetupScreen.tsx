import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Clipboard } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../constants/theme';
import AppHeader from '../components/AppHeader';
import { useStoredModels } from '../hooks/useStoredModels';
import { ModelType } from '../types/models';
import { appleFoundationService } from '../services/AppleFoundationService';

const steps = [
  {
    title: '1. Start the Server',
    body: 'Go to the Server tab in InferrLM and toggle the server switch on. Your device IP and port will appear (e.g. http://192.168.1.10:8889).',
  },
  {
    title: '2. Download a Model',
    body: 'Make sure you have at least one GGUF model downloaded in the Models tab. The model name (with/without .gguf) is what you will use in API requests.',
  },
  {
    title: '3. Configure Your Client',
    body: 'Point any OpenAI-compatible client to your server. Set the base URL to http://<device-ip>:8889/v1. No API key is required — use any placeholder if the client requires one.',
  },
  {
    title: '5. Send a Request',
    body: 'curl -X POST http://<device-ip>:8889/v1/chat/completions \\\n  -H "Content-Type: application/json" \\\n  -d \'{"model": "llama-3.2-1b", "messages": [{"role": "user", "content": "Hi"}]}\'',
  },
];

export default function APISetupScreen() {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme as 'light' | 'dark'];
  const { storedModels } = useStoredModels();
  const [copiedName, setCopiedName] = useState<string | null>(null);
  const [foundationEnabled, setFoundationEnabled] = useState(false);

  useEffect(() => {
    appleFoundationService.isEnabled().then(setFoundationEnabled);
  }, []);

  const ggufModels = storedModels.filter(m => m.modelType !== ModelType.PROJECTION);
  const hasModels = foundationEnabled || ggufModels.length > 0;

  const copyName = (name: string) => {
    const displayName = name.replace(/\.gguf$/i, '');
    Clipboard.setString(displayName);
    setCopiedName(name);
    setTimeout(() => setCopiedName(null), 1500);
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <AppHeader title="API Setup" showBackButton rightButtons={[]} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.heading, { color: themeColors.text }]}>
          Quick Start
        </Text>
        <Text style={[styles.subtitle, { color: themeColors.secondaryText }]}>
          Connect any OpenAI-compatible app to your local models. This works with any application or library that supports the OpenAI API. Both devices must be on the same local network.
        </Text>

        {steps.slice(0, 3).map((step, i) => (
          <View
            key={i}
            style={[styles.card, { backgroundColor: currentTheme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f7f9fc' }]}
          >
            <Text style={[styles.stepTitle, { color: themeColors.text }]}>{step.title}</Text>
            <Text style={[styles.stepBody, { color: themeColors.secondaryText }]}>{step.body}</Text>
          </View>
        ))}

        <View style={[styles.card, { backgroundColor: currentTheme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f7f9fc' }]}>
          <Text style={[styles.stepTitle, { color: themeColors.text }]}>4. Set the Model Name</Text>
          <Text style={[styles.stepBody, { color: themeColors.secondaryText, marginBottom: hasModels ? 12 : 0 }]}>
            Use a model name below as the "model" field in your requests. The .gguf extension is optional.
          </Text>
          {foundationEnabled && (
            <View
              style={[styles.modelRow, { borderColor: themeColors.borderColor }]}
            >
              <Text style={[styles.modelName, { color: themeColors.text }]} numberOfLines={1}>
                apple-foundation
              </Text>
              <TouchableOpacity
                style={[styles.copyBtn, { backgroundColor: copiedName === 'apple-foundation' ? '#28a745' : (currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : themeColors.primary + '15') }]}
                onPress={() => copyName('apple-foundation')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons
                  name={copiedName === 'apple-foundation' ? 'check' : 'content-copy'}
                  size={15}
                  color={copiedName === 'apple-foundation' ? '#fff' : themeColors.primary}
                />
              </TouchableOpacity>
            </View>
          )}
          {ggufModels.length === 0 ? null : ggufModels.map((m) => {
            const displayName = m.name.replace(/\.gguf$/i, '');
            const copied = copiedName === m.name;
            return (
              <View
                key={m.id}
                style={[styles.modelRow, { borderColor: themeColors.borderColor }]}
              >
                <Text style={[styles.modelName, { color: themeColors.text }]} numberOfLines={1}>
                  {displayName}
                </Text>
                <TouchableOpacity
                  style={[styles.copyBtn, { backgroundColor: copied ? '#28a745' : (currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : themeColors.primary + '15') }]}
                  onPress={() => copyName(m.name)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons
                    name={copied ? 'check' : 'content-copy'}
                    size={15}
                    color={copied ? '#fff' : themeColors.primary}
                  />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {steps.slice(3).map((step, i) => (
          <View
            key={i}
            style={[styles.card, { backgroundColor: currentTheme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f7f9fc' }]}
          >
            <Text style={[styles.stepTitle, { color: themeColors.text }]}>{step.title}</Text>
            <Text style={[styles.codeText, { color: themeColors.secondaryText }]}>{step.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  stepBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  codeText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Courier',
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  modelName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Courier',
    marginRight: 8,
  },
  copyBtn: {
    padding: 6,
    borderRadius: 6,
  },
  note: {
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 21,
  },
});
