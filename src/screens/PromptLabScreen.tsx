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
import ModelSelector from '../components/ModelSelector';
import { theme } from '../constants/theme';
import { GradientBg } from '../services/adapters/GradientBgAdapter';
import { useTheme } from '../context/ThemeContext';
import { useModel } from '../context/ModelContext';
import { engineLabels } from '../managers/inference-manager';
import { modelDownloader } from '../services/ModelDownloader';
import { engineService } from '../services/runtime-service';
import { onlineModelService, OnlineModelService } from '../services/OnlineModelService';
import { skillManager } from '../services/SkillManager';
import { OpenSansFont } from '../hooks/OpenSansFont';

const HISTORY_KEY = '@prompt_lab_history_v1';
const DEFAULT_PROMPT = 'Explain how retrieval-augmented generation differs from a standard chat completion.';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 256;
const DEFAULT_TOP_K = 40;
const DEFAULT_TOP_P = 0.95;

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
  temperature: number;
  maxTokens: number;
  topK: number;
  topP: number;
};

const remoteProviders = new Set(['gemini', 'chatgpt', 'claude']);

const formatModelName = (value: string) => value.replace(/\.(gguf|litertlm|task)$/i, '');

const estimateTokens = (text: string) => {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return words > 0 ? Math.max(1, Math.round(words * 1.33)) : 0;
};

function ParamStepper({
  label,
  value,
  onDecrease,
  onIncrease,
  themeColors,
}: {
  label: string;
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
  themeColors: typeof theme['light'];
}) {
  return (
    <View style={[styles.stepper, { backgroundColor: themeColors.cardBackground }]}>
      <Text style={[styles.stepperLabel, { color: themeColors.secondaryText }]}>{label}</Text>
      <View style={styles.stepperRow}>
        <TouchableOpacity
          style={[styles.stepBtn, { backgroundColor: themeColors.primary + '22' }]}
          onPress={onDecrease}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="minus" size={16} color={themeColors.primary} />
        </TouchableOpacity>
        <Text style={[styles.stepperValue, { color: themeColors.text }]}>{value}</Text>
        <TouchableOpacity
          style={[styles.stepBtn, { backgroundColor: themeColors.primary + '22' }]}
          onPress={onIncrease}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="plus" size={16} color={themeColors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PromptLabScreen() {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const { selectedModelPath } = useModel();
  const { fonts } = OpenSansFont();

  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [output, setOutput] = useState('');
  const [temperature, setTemperature] = useState(DEFAULT_TEMPERATURE);
  const [maxTokens, setMaxTokens] = useState(DEFAULT_MAX_TOKENS);
  const [topK, setTopK] = useState(DEFAULT_TOP_K);
  const [topP, setTopP] = useState(DEFAULT_TOP_P);
  const [history, setHistory] = useState<PromptHistoryEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState({ durationMs: 0, firstTokenMs: 0, tokens: 0 });
  const [tab, setTab] = useState<'output' | 'history'>('output');

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
        if (!raw) return;
        const parsed = JSON.parse(raw) as PromptHistoryEntry[];
        if (Array.isArray(parsed)) setHistory(parsed);
      } catch {}
    };
    loadHistory();
  }, []);

  const persistHistory = async (entry: PromptHistoryEntry) => {
    const next = [entry, ...history].slice(0, 20);
    setHistory(next);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  };

  const handleClearOutput = () => {
    setOutput('');
    setStats({ durationMs: 0, firstTokenMs: 0, tokens: 0 });
  };

  const handleResetLab = () => {
    setPrompt(DEFAULT_PROMPT);
    setSystemPrompt('');
    setTemperature(DEFAULT_TEMPERATURE);
    setMaxTokens(DEFAULT_MAX_TOKENS);
    setTopK(DEFAULT_TOP_K);
    setTopP(DEFAULT_TOP_P);
    handleClearOutput();
  };

  const handleCopy = () => {
    if (!output) return;
    Clipboard.setString(output);
    Alert.alert('Copied', 'Output copied to clipboard.');
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
    if (mergedSystemPrompt) messages.push({ role: 'system', content: mergedSystemPrompt });
    messages.push({ role: 'user', content: prompt.trim() });

    const startedAt = Date.now();
    let firstTokenMs = 0;
    let streamedOutput = '';

    const result = await engineService.mgr().gen(messages, {
      settings: { systemPrompt: mergedSystemPrompt, temperature, maxTokens, topK, topP },
      onToken: (token) => {
        if (token && !firstTokenMs) firstTokenMs = Date.now() - startedAt;
        streamedOutput += token;
        setOutput(streamedOutput);
        setStats({ durationMs: Date.now() - startedAt, firstTokenMs, tokens: estimateTokens(streamedOutput) });
      },
    });

    const finalOutput = streamedOutput || result;
    const finalStats = { durationMs: Date.now() - startedAt, firstTokenMs, tokens: estimateTokens(finalOutput) };

    setOutput(finalOutput);
    setStats(finalStats);
    await persistHistory({
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      model: `${displayModelName} (${engineLabels[engine]})`,
      prompt, systemPrompt, output: finalOutput, ...finalStats,
      temperature, maxTokens, topK, topP,
    });
  };

  const runRemotePrompt = async (provider: string) => {
    const mergedSystemPrompt = await skillManager.buildSystemPrompt(systemPrompt.trim());
    const messages = [] as Array<{ id: string; role: 'system' | 'user'; content: string }>;
    if (mergedSystemPrompt) messages.push({ id: 'system', role: 'system', content: mergedSystemPrompt });
    messages.push({ id: 'user', role: 'user', content: prompt.trim() });

    const startedAt = Date.now();
    let firstTokenMs = 0;
    let streamedOutput = '';

    const result = await onlineModelService.sendMessage(
      provider, messages,
      { temperature, maxTokens, topP, stream: true, streamTokens: true },
      token => {
        if (token && !firstTokenMs) firstTokenMs = Date.now() - startedAt;
        streamedOutput += token;
        setOutput(streamedOutput);
        setStats({ durationMs: Date.now() - startedAt, firstTokenMs, tokens: estimateTokens(streamedOutput) });
        return true;
      },
    );

    const finalOutput = streamedOutput || result;
    const finalStats = { durationMs: Date.now() - startedAt, firstTokenMs, tokens: estimateTokens(finalOutput) };

    setOutput(finalOutput);
    setStats(finalStats);
    await persistHistory({
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      model: provider, prompt, systemPrompt, output: finalOutput, ...finalStats,
      temperature, maxTokens, topK, topP,
    });
  };

  const handleRun = async () => {
    if (!prompt.trim()) {
      Alert.alert('Prompt required', 'Enter a prompt before running.');
      return;
    }
    try {
      setIsRunning(true);
      setOutput('');
      setStats({ durationMs: 0, firstTokenMs: 0, tokens: 0 });
      setTab('output');
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
      Alert.alert('Run failed', error instanceof Error ? error.message : 'Prompt Lab failed');
    } finally {
      setIsRunning(false);
    }
  };

  const hasStats = stats.durationMs > 0;

  return (
    <View style={[styles.root, { backgroundColor: themeColors.background }]}>
      <GradientBg />
      <AppHeader title="Prompt Lab" showBackButton showLogo={false} rightButtons={[]} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <ModelSelector isGenerating={isRunning} />

        <View style={[styles.card, { backgroundColor: themeColors.borderColor }]}>
          <Text style={[styles.cardLabel, { color: themeColors.secondaryText }, fonts.semibold]}>PROMPT</Text>
          <TextInput
            multiline
            value={prompt}
            onChangeText={setPrompt}
            placeholder="Write a prompt to test…"
            placeholderTextColor={themeColors.secondaryText + '80'}
            style={[styles.promptInput, { color: themeColors.text, backgroundColor: themeColors.cardBackground }]}
          />
          <Text style={[styles.cardLabel, { color: themeColors.secondaryText, marginTop: 14 }, fonts.semibold]}>SYSTEM PROMPT</Text>
          <TextInput
            multiline
            value={systemPrompt}
            onChangeText={setSystemPrompt}
            placeholder="Optional system prompt override…"
            placeholderTextColor={themeColors.secondaryText + '80'}
            style={[styles.systemInput, { color: themeColors.text, backgroundColor: themeColors.cardBackground }]}
          />
        </View>

        <View style={[styles.card, { backgroundColor: themeColors.borderColor }]}>
          <Text style={[styles.cardLabel, { color: themeColors.secondaryText }, fonts.semibold]}>PARAMETERS</Text>
          <View style={styles.paramGrid}>
            <ParamStepper
              label="Temperature"
              value={temperature.toFixed(1)}
              onDecrease={() => setTemperature(v => Math.max(0, Number((v - 0.1).toFixed(1))))}
              onIncrease={() => setTemperature(v => Math.min(2, Number((v + 0.1).toFixed(1))))}
              themeColors={themeColors}
            />
            <ParamStepper
              label="Max Tokens"
              value={String(maxTokens)}
              onDecrease={() => setMaxTokens(v => Math.max(32, v - 32))}
              onIncrease={() => setMaxTokens(v => Math.min(2048, v + 32))}
              themeColors={themeColors}
            />
            <ParamStepper
              label="Top K"
              value={String(topK)}
              onDecrease={() => setTopK(v => Math.max(1, v - 5))}
              onIncrease={() => setTopK(v => Math.min(200, v + 5))}
              themeColors={themeColors}
            />
            <ParamStepper
              label="Top P"
              value={topP.toFixed(2)}
              onDecrease={() => setTopP(v => Math.max(0.1, Number((v - 0.05).toFixed(2))))}
              onIncrease={() => setTopP(v => Math.min(1, Number((v + 0.05).toFixed(2))))}
              themeColors={themeColors}
            />
          </View>
          <Text style={[styles.hint, { color: themeColors.secondaryText }]}>Top K applies to local engines only.</Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.runBtn, { backgroundColor: themeColors.primary }]}
            onPress={handleRun}
            disabled={isRunning}
            activeOpacity={0.8}
          >
            {isRunning
              ? <ActivityIndicator color="#FFF" size="small" />
              : <MaterialCommunityIcons name="play" size={18} color="#FFF" />}
            <Text style={[styles.runBtnText, fonts.bold]}>{isRunning ? 'Running…' : 'Run'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: themeColors.borderColor }]}
            onPress={handleClearOutput}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="eraser-variant" size={20} color={themeColors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: themeColors.borderColor }]}
            onPress={handleResetLab}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="restore" size={20} color={themeColors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: themeColors.borderColor }]}
            onPress={handleCopy}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="content-copy" size={20} color={themeColors.text} />
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: themeColors.borderColor }]}>
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabPill, tab === 'output' && { backgroundColor: themeColors.primary }]}
              onPress={() => setTab('output')}
            >
              <Text style={[styles.tabPillText, fonts.semibold, { color: tab === 'output' ? '#FFF' : themeColors.secondaryText }]}>Output</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabPill, tab === 'history' && { backgroundColor: themeColors.primary }]}
              onPress={() => setTab('history')}
            >
              <Text style={[styles.tabPillText, fonts.semibold, { color: tab === 'history' ? '#FFF' : themeColors.secondaryText }]}>
                History {history.length > 0 ? `(${history.length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>

          {tab === 'output' && (
            <>
              {isRunning && !output ? (
                <View style={styles.runningPlaceholder}>
                  <ActivityIndicator color={themeColors.primary} />
                  <Text style={[styles.runningText, { color: themeColors.secondaryText }, fonts.regular]}>Generating…</Text>
                </View>
              ) : (
                <Text style={[styles.outputText, { color: output ? themeColors.text : themeColors.secondaryText }]}>
                  {output || 'Run a prompt to see the output here.'}
                </Text>
              )}
              {hasStats && (
                <View style={styles.statsRow}>
                  <View style={[styles.statPill, { backgroundColor: themeColors.cardBackground }]}>
                    <Text style={[styles.statVal, { color: themeColors.text }, fonts.semibold]}>{stats.durationMs} ms</Text>
                    <Text style={[styles.statKey, { color: themeColors.secondaryText }]}>duration</Text>
                  </View>
                  <View style={[styles.statPill, { backgroundColor: themeColors.cardBackground }]}>
                    <Text style={[styles.statVal, { color: themeColors.text }, fonts.semibold]}>{stats.firstTokenMs} ms</Text>
                    <Text style={[styles.statKey, { color: themeColors.secondaryText }]}>TTFT</Text>
                  </View>
                  <View style={[styles.statPill, { backgroundColor: themeColors.cardBackground }]}>
                    <Text style={[styles.statVal, { color: themeColors.text }, fonts.semibold]}>{stats.tokens}</Text>
                    <Text style={[styles.statKey, { color: themeColors.secondaryText }]}>tokens</Text>
                  </View>
                </View>
              )}
            </>
          )}

          {tab === 'history' && (
            <>
              {history.length === 0 ? (
                <Text style={[styles.outputText, { color: themeColors.secondaryText }]}>No runs yet.</Text>
              ) : (
                history.map(entry => (
                  <TouchableOpacity
                    key={entry.id}
                    style={[styles.historyRow, { backgroundColor: themeColors.cardBackground }]}
                    onPress={() => {
                      setPrompt(entry.prompt);
                      setSystemPrompt(entry.systemPrompt);
                      setOutput(entry.output);
                      setTemperature(entry.temperature);
                      setMaxTokens(entry.maxTokens);
                      setTopK(entry.topK);
                      setTopP(entry.topP);
                      setStats({ durationMs: entry.durationMs, firstTokenMs: entry.firstTokenMs, tokens: entry.tokens });
                      setTab('output');
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.historyPrompt, { color: themeColors.text }, fonts.semibold]} numberOfLines={1}>{entry.prompt}</Text>
                    <Text style={[styles.historyMeta, { color: themeColors.secondaryText }]} numberOfLines={1}>
                      {entry.model} · {new Date(entry.createdAt).toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 12 },

  card: { borderRadius: 18, padding: 16 },
  cardLabel: { fontSize: 11, letterSpacing: 0.8, marginBottom: 10 },

  promptInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  systemInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 76,
    textAlignVertical: 'top',
  },

  paramGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stepper: {
    flex: 1,
    minWidth: '44%',
    borderRadius: 14,
    padding: 12,
  },
  stepperLabel: { fontSize: 12, marginBottom: 10 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: { fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 12, marginTop: 12, lineHeight: 17 },

  actionRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  runBtn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  runBtnText: { color: '#FFF', fontSize: 15 },
  iconBtn: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  tabPillText: { fontSize: 13 },

  runningPlaceholder: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  runningText: { fontSize: 14 },

  outputText: { fontSize: 15, lineHeight: 23, minHeight: 80 },

  statsRow: { flexDirection: 'row', gap: 8, marginTop: 16, flexWrap: 'wrap' },
  statPill: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', minWidth: 80 },
  statVal: { fontSize: 14 },
  statKey: { fontSize: 11, marginTop: 2 },

  historyRow: { borderRadius: 14, padding: 12, marginTop: 8 },
  historyPrompt: { fontSize: 14 },
  historyMeta: { fontSize: 12, marginTop: 3 },
});
