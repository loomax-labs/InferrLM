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
import Dialog from '../components/Dialog';
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
import {
  PROMPT_TEMPLATES,
  DEFAULT_TEMPLATE,
  buildTemplatePrompt,
  defaultTemplateOpts,
  getTemplatePrefix,
  type PromptTemplate,
} from './promptLabTemplates';

const HISTORY_KEY = '@prompt_lab_history_v1';
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

function ModeTile({
  item,
  active,
  onPress,
  disabled,
  themeColors,
  fonts,
}: {
  item: PromptTemplate;
  active: boolean;
  onPress: () => void;
  disabled: boolean;
  themeColors: typeof theme['light'];
  fonts: ReturnType<typeof OpenSansFont>['fonts'];
}) {
  return (
    <TouchableOpacity
      style={[
        styles.modeTile,
        { backgroundColor: active ? themeColors.primary + '28' : themeColors.cardBackground },
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
    >
      <View style={[styles.modeIcon, { backgroundColor: active ? themeColors.primary + '35' : themeColors.primary + '18' }]}>
        <MaterialCommunityIcons
          name={item.icon as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
          size={22}
          color={themeColors.primary}
        />
      </View>
      <Text style={[styles.modeLabel, fonts.semibold, { color: active ? themeColors.primary : themeColors.text }]} numberOfLines={1}>
        {item.label}
      </Text>
      <Text style={[styles.modeHint, { color: themeColors.secondaryText }]} numberOfLines={2}>
        {item.hint}
      </Text>
    </TouchableOpacity>
  );
}

export default function PromptLabScreen() {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const { selectedModelPath } = useModel();
  const { fonts } = OpenSansFont();

  const [content, setContent] = useState('');
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
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE.id);
  const [templateOpts, setTemplateOpts] = useState<Record<string, string>>(() => defaultTemplateOpts(DEFAULT_TEMPLATE));
  const [showExamples, setShowExamples] = useState(false);
  const [showParams, setShowParams] = useState(false);

  const activeTemplate = useMemo(
    () => PROMPT_TEMPLATES.find(t => t.id === templateId) ?? DEFAULT_TEMPLATE,
    [templateId],
  );

  const fullPrompt = useMemo(
    () => buildTemplatePrompt(activeTemplate, content, templateOpts),
    [activeTemplate, content, templateOpts],
  );

  const promptPrefix = useMemo(
    () => getTemplatePrefix(activeTemplate, templateOpts),
    [activeTemplate, templateOpts],
  );

  const hasWrapper = Boolean(activeTemplate.buildPrompt);
  const showCompiled = hasWrapper && content.trim().length > 0;
  const canRun = content.trim().length > 0 && !isRunning;

  const localModelPath = engineService.getActiveModelPath() || (selectedModelPath && !remoteProviders.has(OnlineModelService.getBaseProvider(selectedModelPath)) ? selectedModelPath : null);
  const isRemoteSelection = Boolean(selectedModelPath && remoteProviders.has(OnlineModelService.getBaseProvider(selectedModelPath)));
  const displayModelName = useMemo(() => {
    if (isRemoteSelection && selectedModelPath) return selectedModelPath;
    if (localModelPath) return formatModelName(localModelPath.split('/').pop() || localModelPath);
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
    setContent('');
    setSystemPrompt('');
    setTemperature(DEFAULT_TEMPERATURE);
    setMaxTokens(DEFAULT_MAX_TOKENS);
    setTopK(DEFAULT_TOP_K);
    setTopP(DEFAULT_TOP_P);
    setTemplateId(DEFAULT_TEMPLATE.id);
    setTemplateOpts(defaultTemplateOpts(DEFAULT_TEMPLATE));
    handleClearOutput();
  };

  const handleTemplatePick = (id: string) => {
    const next = PROMPT_TEMPLATES.find(t => t.id === id) ?? DEFAULT_TEMPLATE;
    setContent('');
    setTemplateId(next.id);
    setTemplateOpts(defaultTemplateOpts(next));
  };

  const handleOptionPick = (key: string, value: string) => {
    setTemplateOpts(prev => ({ ...prev, [key]: value }));
  };

  const handleCopyPrompt = () => {
    if (!content.trim()) return;
    Clipboard.setString(fullPrompt);
    Alert.alert('Copied', 'Full prompt copied to clipboard.');
  };

  const handleCopyOutput = () => {
    if (!output) return;
    Clipboard.setString(output);
    Alert.alert('Copied', 'Output copied to clipboard.');
  };

  const runLocalPrompt = async (modelPath: string, promptText: string) => {
    const storedModels = await modelDownloader.getStoredModels();
    const storedEntry = storedModels.find(model => model.path === modelPath);
    const engine = engineService.getEngineForModel(modelPath, storedEntry?.modelFormat);

    if (!engineService.ready() || engineService.getActiveModelPath() !== modelPath || engine === 'litert') {
      await engineService.initModel(modelPath, undefined, storedEntry?.modelFormat);
    }

    const mergedSystemPrompt = await skillManager.buildSystemPrompt(systemPrompt.trim());
    const messages = [] as Array<{ role: string; content: string }>;
    if (mergedSystemPrompt) messages.push({ role: 'system', content: mergedSystemPrompt });
    messages.push({ role: 'user', content: promptText.trim() });

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
      prompt: promptText, systemPrompt, output: finalOutput, ...finalStats,
      temperature, maxTokens, topK, topP,
    });
  };

  const runRemotePrompt = async (provider: string, promptText: string) => {
    const mergedSystemPrompt = await skillManager.buildSystemPrompt(systemPrompt.trim());
    const messages = [] as Array<{ id: string; role: 'system' | 'user'; content: string }>;
    if (mergedSystemPrompt) messages.push({ id: 'system', role: 'system', content: mergedSystemPrompt });
    messages.push({ id: 'user', role: 'user', content: promptText.trim() });

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
      model: provider, prompt: promptText, systemPrompt, output: finalOutput, ...finalStats,
      temperature, maxTokens, topK, topP,
    });
  };

  const handleRun = async () => {
    if (!canRun) {
      Alert.alert('Content required', 'Enter content before running.');
      return;
    }
    try {
      setIsRunning(true);
      setOutput('');
      setStats({ durationMs: 0, firstTokenMs: 0, tokens: 0 });
      setTab('output');
      await skillManager.syncTools();

      if (isRemoteSelection && selectedModelPath) {
        await runRemotePrompt(selectedModelPath, fullPrompt);
        return;
      }
      if (!localModelPath) {
        Alert.alert('No model', 'Load a local model or select a remote provider before using Prompt Lab.');
        return;
      }
      await runLocalPrompt(localModelPath, fullPrompt);
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

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <ModelSelector isGenerating={isRunning} />

        <View style={[styles.card, { backgroundColor: themeColors.borderColor }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }, fonts.semibold]}>Mode</Text>
          <View style={styles.modeGrid}>
            {PROMPT_TEMPLATES.map(item => (
              <ModeTile
                key={item.id}
                item={item}
                active={item.id === templateId}
                onPress={() => handleTemplatePick(item.id)}
                disabled={isRunning}
                themeColors={themeColors}
                fonts={fonts}
              />
            ))}
          </View>
        </View>

        {activeTemplate.options?.map(opt => (
          <View key={opt.key} style={[styles.card, { backgroundColor: themeColors.borderColor }]}>
            <Text style={[styles.cardLabel, { color: themeColors.secondaryText }, fonts.semibold]}>{opt.label.toUpperCase()}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {opt.choices.map(choice => {
                const active = templateOpts[opt.key] === choice;
                return (
                  <TouchableOpacity
                    key={choice}
                    style={[styles.chip, { backgroundColor: active ? themeColors.primary : themeColors.cardBackground }]}
                    onPress={() => handleOptionPick(opt.key, choice)}
                    disabled={isRunning}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, fonts.semibold, { color: active ? '#FFF' : themeColors.text }]} numberOfLines={1}>
                      {choice}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ))}

        <View style={[styles.card, { backgroundColor: themeColors.borderColor }]}>
          <View style={styles.inputHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.text, marginBottom: 0 }, fonts.semibold]}>Your text</Text>
            <TouchableOpacity onPress={() => setShowExamples(true)} disabled={isRunning} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.linkText, { color: themeColors.primary }, fonts.semibold]}>Examples</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            multiline
            value={content}
            onChangeText={setContent}
            placeholder={activeTemplate.placeholder}
            placeholderTextColor={themeColors.secondaryText + '80'}
            style={[styles.contentInput, { color: themeColors.text, backgroundColor: themeColors.cardBackground }]}
            editable={!isRunning}
          />

          {showCompiled && (
            <View style={[styles.compiledBox, { backgroundColor: themeColors.primary + '14' }]}>
              <Text style={[styles.compiledLabel, { color: themeColors.primary }, fonts.semibold]}>SENT TO MODEL</Text>
              <Text style={[styles.compiledPrefix, { color: themeColors.primary }]}>{promptPrefix}</Text>
              <Text style={[styles.compiledBody, { color: themeColors.text }]}>{content}</Text>
            </View>
          )}
        </View>

        <View style={styles.toolRow}>
          <TouchableOpacity
            style={[styles.toolBtn, { backgroundColor: themeColors.borderColor }]}
            onPress={handleCopyPrompt}
            disabled={!content.trim()}
          >
            <MaterialCommunityIcons name="content-copy" size={18} color={content.trim() ? themeColors.text : themeColors.secondaryText} />
            <Text style={[styles.toolBtnText, { color: content.trim() ? themeColors.text : themeColors.secondaryText }]}>Copy prompt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toolBtn, { backgroundColor: themeColors.borderColor }]} onPress={handleClearOutput}>
            <MaterialCommunityIcons name="eraser-variant" size={18} color={themeColors.text} />
            <Text style={[styles.toolBtnText, { color: themeColors.text }]}>Clear output</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toolBtn, { backgroundColor: themeColors.borderColor }]} onPress={handleResetLab}>
            <MaterialCommunityIcons name="restore" size={18} color={themeColors.text} />
            <Text style={[styles.toolBtnText, { color: themeColors.text }]}>Reset</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.runBtn, { backgroundColor: canRun ? themeColors.primary : themeColors.borderColor }]}
          onPress={handleRun}
          disabled={!canRun}
          activeOpacity={0.8}
        >
          {isRunning
            ? <ActivityIndicator color="#FFF" size="small" />
            : <MaterialCommunityIcons name="play" size={20} color={canRun ? '#FFF' : themeColors.secondaryText} />}
          <Text style={[styles.runBtnText, fonts.bold, { color: canRun ? '#FFF' : themeColors.secondaryText }]}>
            {isRunning ? 'Running…' : 'Run prompt'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.paramsToggle, { backgroundColor: themeColors.borderColor }]}
          onPress={() => setShowParams(v => !v)}
          activeOpacity={0.75}
        >
          <MaterialCommunityIcons name="tune" size={18} color={themeColors.secondaryText} />
          <Text style={[styles.paramsToggleText, { color: themeColors.secondaryText }, fonts.semibold]}>
            Parameters & system prompt
          </Text>
          <MaterialCommunityIcons name={showParams ? 'chevron-up' : 'chevron-down'} size={20} color={themeColors.secondaryText} />
        </TouchableOpacity>

        {showParams && (
          <View style={[styles.card, { backgroundColor: themeColors.borderColor }]}>
            <Text style={[styles.cardLabel, { color: themeColors.secondaryText }, fonts.semibold]}>SYSTEM PROMPT</Text>
            <TextInput
              multiline
              value={systemPrompt}
              onChangeText={setSystemPrompt}
              placeholder="Optional system prompt override…"
              placeholderTextColor={themeColors.secondaryText + '80'}
              style={[styles.systemInput, { color: themeColors.text, backgroundColor: themeColors.cardBackground }]}
            />
            <Text style={[styles.cardLabel, { color: themeColors.secondaryText, marginTop: 14 }, fonts.semibold]}>PARAMETERS</Text>
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
        )}

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
            {output.length > 0 && (
              <TouchableOpacity style={styles.copyOutBtn} onPress={handleCopyOutput} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="content-copy" size={18} color={themeColors.secondaryText} />
              </TouchableOpacity>
            )}
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
                      setContent(entry.prompt);
                      setSystemPrompt(entry.systemPrompt);
                      setOutput(entry.output);
                      setTemperature(entry.temperature);
                      setMaxTokens(entry.maxTokens);
                      setTopK(entry.topK);
                      setTopP(entry.topP);
                      setTemplateId(DEFAULT_TEMPLATE.id);
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

      <Dialog visible={showExamples} onDismiss={() => setShowExamples(false)} title="Example prompts">
        <ScrollView style={styles.exampleScroll} showsVerticalScrollIndicator={false}>
          {activeTemplate.examples.map((example, idx) => (
            <TouchableOpacity
              key={`${activeTemplate.id}-ex-${idx}`}
              style={[styles.exampleItem, { backgroundColor: themeColors.cardBackground }]}
              onPress={() => {
                setContent(example);
                setShowExamples(false);
              }}
              activeOpacity={0.75}
            >
              <Text style={[styles.exampleItemText, { color: themeColors.text }]}>{example}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 12 },

  card: { borderRadius: 18, padding: 16 },
  sectionTitle: { fontSize: 17, marginBottom: 12 },
  cardLabel: { fontSize: 11, letterSpacing: 0.8, marginBottom: 10 },

  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  modeTile: {
    width: '47%',
    flexGrow: 1,
    borderRadius: 14,
    padding: 12,
    minHeight: 108,
  },
  modeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modeLabel: { fontSize: 14, marginBottom: 4 },
  modeHint: { fontSize: 12, lineHeight: 16 },

  chipRow: { gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    maxWidth: 260,
  },
  chipText: { fontSize: 13 },

  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  linkText: { fontSize: 14 },

  contentInput: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 130,
    textAlignVertical: 'top',
  },

  compiledBox: {
    marginTop: 12,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  compiledLabel: { fontSize: 10, letterSpacing: 0.8, marginBottom: 4 },
  compiledPrefix: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  compiledBody: { fontSize: 14, lineHeight: 21 },

  toolRow: { flexDirection: 'row', gap: 8 },
  toolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
  },
  toolBtnText: { fontSize: 12, fontWeight: '600' },

  runBtn: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  runBtnText: { fontSize: 16 },

  paramsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
  },
  paramsToggleText: { flex: 1, fontSize: 13 },

  systemInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 76,
    textAlignVertical: 'top',
  },

  paramGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stepper: { flex: 1, minWidth: '44%', borderRadius: 14, padding: 12 },
  stepperLabel: { fontSize: 12, marginBottom: 10 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 12, marginTop: 12, lineHeight: 17 },

  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16, alignItems: 'center' },
  tabPill: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  tabPillText: { fontSize: 13 },
  copyOutBtn: { marginLeft: 'auto', padding: 4 },

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

  exampleScroll: { maxHeight: 360 },
  exampleItem: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  exampleItemText: { fontSize: 14, lineHeight: 20 },
});
