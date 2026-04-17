import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
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
import { useTheme } from '../context/ThemeContext';
import { useModel } from '../context/ModelContext';
import { engineLabels } from '../managers/inference-manager';
import { modelDownloader } from '../services/ModelDownloader';
import { engineService } from '../services/inference-engine-service';
import { onlineModelService, OnlineModelService } from '../services/OnlineModelService';
import { skillManager } from '../services/SkillManager';

const HISTORY_KEY = '@prompt_lab_history_v1';
const DEFAULT_PROMPT = 'Explain how retrieval-augmented generation differs from a standard chat completion.';

type PromptHistoryEntry = {
  id: string;
  createdAt: string;
  model: string;
  prompt: string;
  systemPrompt: string;
  output: string;
  durationMs: number;
  firstTokenMs: number;
  tokens: number;
};

const remoteProviders = new Set(['gemini', 'chatgpt', 'claude']);

const formatModelName = (value: string) => value.replace(/\.(gguf|litertlm|task)$/i, '');

const estimateTokens = (text: string) => {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return words > 0 ? Math.max(1, Math.round(words * 1.33)) : 0;
};

function CounterField({
  label,
  value,
  onDecrease,
  onIncrease,
  valueColor,
  accentColor,
  labelColor,
}: {
  label: string;
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
  valueColor: string;
  accentColor: string;
  labelColor: string;
}) {
  return (
    <View style={styles.counterCard}>
      <Text style={[styles.counterLabel, { color: labelColor }]}>{label}</Text>
      <View style={styles.counterRow}>
        <TouchableOpacity style={[styles.counterButton, { backgroundColor: accentColor }]} onPress={onDecrease}>
          <MaterialCommunityIcons name="minus" size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.counterValue, { color: valueColor }]}>{value}</Text>
        <TouchableOpacity style={[styles.counterButton, { backgroundColor: accentColor }]} onPress={onIncrease}>
          <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PromptLabScreen() {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const { selectedModelPath } = useModel();
  const accentColor = currentTheme === 'dark' ? '#2E8B57' : '#1C6B4A';
  const valueColor = currentTheme === 'dark' ? '#F5F2E8' : '#111111';

  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [output, setOutput] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(256);
  const [history, setHistory] = useState<PromptHistoryEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState({ durationMs: 0, firstTokenMs: 0, tokens: 0 });

  const localModelPath = engineService.getActiveModelPath() || (selectedModelPath && !remoteProviders.has(OnlineModelService.getBaseProvider(selectedModelPath)) ? selectedModelPath : null);
  const isRemoteSelection = Boolean(selectedModelPath && remoteProviders.has(OnlineModelService.getBaseProvider(selectedModelPath)));
  const displayModelName = useMemo(() => {
    if (isRemoteSelection && selectedModelPath) {
      return selectedModelPath;
    }
    if (localModelPath) {
      return formatModelName(localModelPath.split('/').pop() || localModelPath);
    }
    return 'No model selected';
  }, [isRemoteSelection, localModelPath, selectedModelPath]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const raw = await AsyncStorage.getItem(HISTORY_KEY);
        if (!raw) {
          return;
        }
        const parsed = JSON.parse(raw) as PromptHistoryEntry[];
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      } catch {
      }
    };

    loadHistory();
  }, []);

  const persistHistory = async (entry: PromptHistoryEntry) => {
    const next = [entry, ...history].slice(0, 20);
    setHistory(next);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  };

  const handleCopy = () => {
    if (!output) {
      return;
    }
    Clipboard.setString(output);
    Alert.alert('Copied', 'Prompt Lab output copied to clipboard.');
  };

  const runLocalPrompt = async (modelPath: string) => {
    const storedModels = await modelDownloader.getStoredModels();
    const storedEntry = storedModels.find(model => model.path === modelPath);
    const engine = engineService.getEngineForModel(modelPath, storedEntry?.modelFormat);

    if (!engineService.ready() || engineService.getActiveModelPath() !== modelPath || engine === 'litert') {
      await engineService.initModel(modelPath, undefined, storedEntry?.modelFormat);
    }

    const mergedSystemPrompt = await skillManager.buildSystemPrompt(systemPrompt.trim());
    const messages = [] as Array<{ role: string; content: string }>;
    if (mergedSystemPrompt) {
      messages.push({ role: 'system', content: mergedSystemPrompt });
    }
    messages.push({ role: 'user', content: prompt.trim() });

    const startedAt = Date.now();
    let firstTokenMs = 0;
    let streamedOutput = '';

    const result = await engineService.mgr().gen(messages, {
      settings: {
        systemPrompt: mergedSystemPrompt,
        temperature,
        maxTokens,
      },
      onToken: (token) => {
        if (token && !firstTokenMs) {
          firstTokenMs = Date.now() - startedAt;
        }
        streamedOutput += token;
        setOutput(streamedOutput);
        setStats({
          durationMs: Date.now() - startedAt,
          firstTokenMs,
          tokens: estimateTokens(streamedOutput),
        });
      },
    });

    const finalOutput = streamedOutput || result;
    const finalStats = {
      durationMs: Date.now() - startedAt,
      firstTokenMs,
      tokens: estimateTokens(finalOutput),
    };

    setOutput(finalOutput);
    setStats(finalStats);
    await persistHistory({
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      model: `${displayModelName} (${engineLabels[engine]})`,
      prompt,
      systemPrompt,
      output: finalOutput,
      ...finalStats,
    });
  };

  const runRemotePrompt = async (provider: string) => {
    const mergedSystemPrompt = await skillManager.buildSystemPrompt(systemPrompt.trim());
    const messages = [] as Array<{ id: string; role: 'system' | 'user'; content: string }>;
    if (mergedSystemPrompt) {
      messages.push({ id: 'system', role: 'system', content: mergedSystemPrompt });
    }
    messages.push({ id: 'user', role: 'user', content: prompt.trim() });

    const startedAt = Date.now();
    let firstTokenMs = 0;
    let streamedOutput = '';

    const result = await onlineModelService.sendMessage(
      provider,
      messages,
      {
        temperature,
        maxTokens,
        stream: true,
        streamTokens: true,
      },
      token => {
        if (token && !firstTokenMs) {
          firstTokenMs = Date.now() - startedAt;
        }
        streamedOutput += token;
        setOutput(streamedOutput);
        setStats({
          durationMs: Date.now() - startedAt,
          firstTokenMs,
          tokens: estimateTokens(streamedOutput),
        });
        return true;
      },
    );

    const finalOutput = streamedOutput || result;
    const finalStats = {
      durationMs: Date.now() - startedAt,
      firstTokenMs,
      tokens: estimateTokens(finalOutput),
    };

    setOutput(finalOutput);
    setStats(finalStats);
    await persistHistory({
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      model: provider,
      prompt,
      systemPrompt,
      output: finalOutput,
      ...finalStats,
    });
  };

  const handleRun = async () => {
    if (!prompt.trim()) {
      Alert.alert('Prompt required', 'Enter a prompt before running Prompt Lab.');
      return;
    }

    try {
      setIsRunning(true);
      setOutput('');
      setStats({ durationMs: 0, firstTokenMs: 0, tokens: 0 });
      await skillManager.syncTools();

      if (isRemoteSelection && selectedModelPath) {
        await runRemotePrompt(selectedModelPath);
        return;
      }

      if (!localModelPath) {
        Alert.alert('No model', 'Load a local model or select a remote provider before using Prompt Lab.');
        return;
      }

      await runLocalPrompt(localModelPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Prompt Lab failed';
      Alert.alert('Prompt Lab failed', message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <AppHeader title="Prompt Lab" showBackButton showLogo={false} rightButtons={[]} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={[styles.heroCard, { backgroundColor: themeColors.borderColor }]}> 
          <Text style={[styles.heroTitle, { color: themeColors.text }]}>{displayModelName}</Text>
          <Text style={[styles.heroSubtitle, { color: themeColors.secondaryText }]}>Single-turn prompt testing with no retained chat history.</Text>
        </View>

        <View style={[styles.card, { backgroundColor: themeColors.borderColor }]}> 
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Prompt</Text>
          <TextInput
            multiline
            value={prompt}
            onChangeText={setPrompt}
            placeholder="Write a prompt to test"
            placeholderTextColor={themeColors.secondaryText}
            style={[styles.input, styles.promptInput, { color: themeColors.text, borderColor: themeColors.secondaryText + '30' }]}
          />
          <TextInput
            multiline
            value={systemPrompt}
            onChangeText={setSystemPrompt}
            placeholder="Optional system prompt override"
            placeholderTextColor={themeColors.secondaryText}
            style={[styles.input, styles.systemInput, { color: themeColors.text, borderColor: themeColors.secondaryText + '30' }]}
          />

          <View style={styles.counterGrid}>
            <CounterField
              label="Temperature"
              value={temperature.toFixed(1)}
              onDecrease={() => setTemperature(value => Math.max(0, Number((value - 0.1).toFixed(1))))}
              onIncrease={() => setTemperature(value => Math.min(2, Number((value + 0.1).toFixed(1))))}
              valueColor={valueColor}
              accentColor={accentColor}
              labelColor={themeColors.secondaryText}
            />
            <CounterField
              label="Max Tokens"
              value={String(maxTokens)}
              onDecrease={() => setMaxTokens(value => Math.max(32, value - 32))}
              onIncrease={() => setMaxTokens(value => Math.min(2048, value + 32))}
              valueColor={valueColor}
              accentColor={accentColor}
              labelColor={themeColors.secondaryText}
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: themeColors.primary }]} onPress={handleRun} disabled={isRunning}>
              {isRunning ? <ActivityIndicator color="#FFFFFF" /> : <MaterialCommunityIcons name="flask-outline" size={18} color="#FFFFFF" />}
              <Text style={styles.primaryButtonText}>{isRunning ? 'Running...' : 'Run Prompt'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryButton, { borderColor: themeColors.secondaryText + '30' }]} onPress={() => setOutput('')}>
              <MaterialCommunityIcons name="eraser-variant" size={18} color={themeColors.text} />
              <Text style={[styles.secondaryButtonText, { color: themeColors.text }]}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryButton, { borderColor: themeColors.secondaryText + '30' }]} onPress={handleCopy}>
              <MaterialCommunityIcons name="content-copy" size={18} color={themeColors.text} />
              <Text style={[styles.secondaryButtonText, { color: themeColors.text }]}>Copy</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: themeColors.borderColor }]}> 
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Live Output</Text>
          <Text style={[styles.outputText, { color: themeColors.text }]}>{output || 'Run a prompt to inspect the raw response here.'}</Text>
          <View style={styles.statsRow}>
            <Text style={[styles.statText, { color: themeColors.secondaryText }]}>Duration {stats.durationMs} ms</Text>
            <Text style={[styles.statText, { color: themeColors.secondaryText }]}>TTFT {stats.firstTokenMs} ms</Text>
            <Text style={[styles.statText, { color: themeColors.secondaryText }]}>Tokens {stats.tokens}</Text>
          </View>
        </View>

        {history.length > 0 && (
          <View style={[styles.card, { backgroundColor: themeColors.borderColor }]}> 
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Recent Runs</Text>
            {history.map(entry => (
              <TouchableOpacity
                key={entry.id}
                style={[styles.historyItem, { borderColor: themeColors.secondaryText + '20' }]}
                onPress={() => {
                  setPrompt(entry.prompt);
                  setSystemPrompt(entry.systemPrompt);
                  setOutput(entry.output);
                  setStats({ durationMs: entry.durationMs, firstTokenMs: entry.firstTokenMs, tokens: entry.tokens });
                }}
              >
                <Text style={[styles.historyTitle, { color: themeColors.text }]} numberOfLines={1}>{entry.prompt}</Text>
                <Text style={[styles.historyMeta, { color: themeColors.secondaryText }]} numberOfLines={1}>
                  {entry.model} • {new Date(entry.createdAt).toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
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
  heroCard: {
    borderRadius: 18,
    padding: 18,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 14,
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
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  promptInput: {
    minHeight: 128,
  },
  systemInput: {
    minHeight: 88,
    marginTop: 12,
  },
  counterGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  counterCard: {
    flex: 1,
    minWidth: 120,
  },
  counterLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counterButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  outputText: {
    fontSize: 15,
    lineHeight: 22,
    minHeight: 96,
  },
  statsRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statText: {
    fontSize: 13,
    fontWeight: '600',
  },
  historyItem: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  historyMeta: {
    marginTop: 4,
    fontSize: 13,
  },
});
