import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import AppHeader from '../components/AppHeader';
import { theme } from '../constants/theme';
import { GradientBg } from '../services/adapters/GradientBgAdapter';
import { useTheme } from '../context/ThemeContext';
import { useModel } from '../context/ModelContext';
import { skillManager } from '../services/SkillManager';
import { toolAgentService } from '../services/ToolAgentService';
import { OnlineModelService } from '../services/OnlineModelService';
import { registerMobileActionTools, unregisterMobileActionTools, type MobileActionLog } from '../services/tools/MobileActionsTools';

const QUICK_PROMPTS = [
  'Open device settings.',
  'Draft an email to support@inferrlm.app asking for help with LiteRT models.',
  'Open maps for coffee near Salt Lake, Kolkata.',
  'Open https://inferrlm.app/privacy-policy.',
  'Create a contact for Ada Lovelace with email ada@example.com and phone +1 415 555 0100.',
  'Create a calendar event titled Team Sync tomorrow at 10:00 AM for 45 minutes with notes Bring the benchmark report.',
  'Draft an SMS to +1 415 555 0100 saying I will be there in 10 minutes.',
  'Open the dialer for +1 415 555 0100.',
];

export default function MobileActionsScreen() {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const { selectedModelPath } = useModel();

  const [prompt, setPrompt] = useState('Open device settings.');
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('Idle');
  const [isRunning, setIsRunning] = useState(false);
  const [actionLog, setActionLog] = useState<MobileActionLog[]>([]);

  const provider = useMemo(() => {
    if (!selectedModelPath) {
      return null;
    }
    const base = OnlineModelService.getBaseProvider(selectedModelPath);
    return ['gemini', 'chatgpt', 'claude'].includes(base) ? selectedModelPath : null;
  }, [selectedModelPath]);

  useEffect(() => {
    registerMobileActionTools({
      onAction: entry => {
        setActionLog(current => [entry, ...current].slice(0, 20));
      },
    });

    return () => {
      unregisterMobileActionTools();
    };
  }, []);

  const handleRun = async () => {
    if (!provider) {
      Alert.alert('Remote model required', 'Select Gemini, OpenAI, or Claude to run AI-driven mobile actions.');
      return;
    }
    if (!prompt.trim()) {
      return;
    }

    try {
      setIsRunning(true);
      setStatus('Running');
      setResponse('');
      await skillManager.syncTools();
      const systemPrompt = await skillManager.buildSystemPrompt(
        'You are a device assistant. Use the available action tools whenever the user asks to open settings, visit a site, draft an email, or open maps. Keep the final answer short and confirm what happened.',
        'You are a device assistant. Use the available action tools whenever the user asks to open settings, visit a site, draft an email, open maps, prepare a call or SMS, create a contact, or create a calendar event. Prefer the matching tool over plain text instructions. Keep the final answer short and confirm what happened.',
      );
      const result = await toolAgentService.run(
        provider,
        [
          {
            id: 'system-mobile-actions',
            role: 'system',
            content: systemPrompt,
          },
          {
            id: 'user-mobile-actions',
            role: 'user',
            content: prompt.trim(),
          },
        ],
        {
          temperature: 0.2,
          maxTokens: 300,
        },
        {
          onStatus: setStatus,
        },
      );
      setResponse(result.finalText || 'Action completed.');
      setStatus('Done');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setStatus('Failed');
      Alert.alert('Mobile Actions failed', message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <GradientBg />
      <AppHeader title="Mobile Actions" showBackButton showLogo={false} rightButtons={[]} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: themeColors.borderColor }]}> 
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Prompt</Text>
          <TextInput
            value={prompt}
            onChangeText={setPrompt}
            multiline
            placeholder="Ask for a site, map, email, SMS, dialer, contact, or calendar action."
            placeholderTextColor={themeColors.secondaryText}
            style={[styles.input, { color: themeColors.text, borderColor: themeColors.secondaryText + '30' }]}
          />

          <View style={styles.quickRow}>
            {QUICK_PROMPTS.map(item => (
              <TouchableOpacity key={item} style={[styles.quickChip, { borderColor: themeColors.secondaryText + '30' }]} onPress={() => setPrompt(item)}>
                <Text style={[styles.quickChipText, { color: themeColors.text }]} numberOfLines={2}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: themeColors.primary }]} onPress={handleRun} disabled={isRunning}>
            {isRunning ? <ActivityIndicator color="#FFFFFF" /> : <MaterialCommunityIcons name="cellphone-cog" size={18} color="#FFFFFF" />}
            <Text style={styles.primaryButtonText}>{isRunning ? 'Running...' : 'Run Action Prompt'}</Text>
          </TouchableOpacity>
          <Text style={[styles.caption, { color: themeColors.secondaryText }]}>Current provider: {provider || 'Not a remote tool-capable model'}</Text>
          <Text style={[styles.caption, { color: themeColors.secondaryText }]}>Status: {status}</Text>
          <Text style={[styles.caption, { color: themeColors.secondaryText }]}>Supported actions: browser, maps, email, settings, dialer, SMS, contact form, calendar event form.</Text>
        </View>

        <View style={[styles.card, { backgroundColor: themeColors.borderColor }]}> 
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Assistant Response</Text>
          <Text style={[styles.responseText, { color: themeColors.text }]}>{response || 'The assistant response will appear here after a tool run.'}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: themeColors.borderColor }]}> 
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Action Log</Text>
          {actionLog.length === 0 ? (
            <Text style={[styles.caption, { color: themeColors.secondaryText }]}>No actions executed yet.</Text>
          ) : (
            actionLog.map((entry, index) => (
              <View key={`${entry.createdAt}-${index}`} style={[styles.logItem, { borderColor: themeColors.secondaryText + '20' }]}> 
                <Text style={[styles.logTitle, { color: themeColors.text }]}>{entry.tool}</Text>
                <Text style={[styles.logMeta, { color: themeColors.secondaryText }]}>{entry.summary}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: 18,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  quickRow: {
    marginTop: 12,
    gap: 10,
  },
  quickChip: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 14,
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  caption: {
    marginTop: 10,
    fontSize: 13,
  },
  responseText: {
    fontSize: 15,
    lineHeight: 22,
    minHeight: 88,
  },
  logItem: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  logTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  logMeta: {
    marginTop: 4,
    fontSize: 13,
  },
});
