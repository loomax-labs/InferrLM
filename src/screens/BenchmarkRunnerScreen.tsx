import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

import AppHeader from '../components/AppHeader';
import { theme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import type { ModelSettings, ModelSettingsConfig } from '../services/ModelSettingsService';
import { modelSettingsService } from '../services/ModelSettingsService';
import { benchmarkService } from '../services/BenchmarkService';
import type { BenchmarkDelta, BenchmarkProgress, BenchmarkResult } from '../types/benchmark';
import { engineLabels, type EngineId } from '../managers/inference-manager';
import { engineService } from '../services/runtime-service';
import { llamaManager } from '../utils/LlamaManager';
import { useStoredModels } from '../hooks/useStoredModels';

const DEFAULT_PROMPT = 'Explain how transformer attention works in two concise paragraphs.';

const fmt = (value: number, digits = 2) => value.toFixed(digits);

const formatModelName = (value: string) => value.replace(/\.(gguf|litertlm|task)$/i, '');

const metricDelta = (current: number, baseline: number, lowerIsBetter = false): number => {
  if (!baseline) return 0;
  const raw = ((current - baseline) / baseline) * 100;
  return lowerIsBetter ? -raw : raw;
};

const buildDelta = (current: BenchmarkResult, baseline: BenchmarkResult): BenchmarkDelta => ({
  ttftMs: metricDelta(current.metrics.ttftMs.avg, baseline.metrics.ttftMs.avg, true),
  totalTimeMs: metricDelta(current.metrics.totalTimeMs.avg, baseline.metrics.totalTimeMs.avg, true),
  prefillTokensPerSecond: metricDelta(
    current.metrics.prefillTokensPerSecond.avg,
    baseline.metrics.prefillTokensPerSecond.avg,
  ),
  decodeTokensPerSecond: metricDelta(
    current.metrics.decodeTokensPerSecond.avg,
    baseline.metrics.decodeTokensPerSecond.avg,
  ),
});

function Counter({
  label,
  value,
  onChange,
  min,
  max,
  labelColor,
  valueColor,
  accent,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  labelColor: string;
  valueColor: string;
  accent: string;
}) {
  return (
    <View style={styles.counterCard}>
      <Text style={[styles.counterLabel, { color: labelColor }]}>{label}</Text>
      <View style={styles.counterRow}>
        <TouchableOpacity style={[styles.counterBtn, { backgroundColor: accent }]} onPress={() => onChange(Math.max(min, value - 1))}>
          <MaterialCommunityIcons name="minus" size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.counterValue, { color: valueColor }]}>{value}</Text>
        <TouchableOpacity style={[styles.counterBtn, { backgroundColor: accent }]} onPress={() => onChange(Math.min(max, value + 1))}>
          <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function BenchmarkRunnerScreen() {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const router = useRouter();
  const { modelName: routeModelName, modelPath: routeModelPath } = useLocalSearchParams<{ modelName?: string; modelPath?: string }>();

  const { storedModels, loadStoredModels } = useStoredModels();
  const [selectedModelName, setSelectedModelName] = useState<string | undefined>(routeModelName);
  const [selectedModelPath, setSelectedModelPath] = useState<string | undefined>(routeModelPath);

  const modelName = selectedModelName ?? '';
  const modelPath = selectedModelPath ?? '';

  const accent = currentTheme === 'dark' ? '#FFA040' : '#B54708';
  const valueColor = currentTheme === 'dark' ? '#F5F2E8' : '#111111';

  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [warmupRuns, setWarmupRuns] = useState(2);
  const [benchmarkRuns, setBenchmarkRuns] = useState(6);
  const [maxTokens, setMaxTokens] = useState(128);
  const [progress, setProgress] = useState<BenchmarkProgress | null>(null);
  const [history, setHistory] = useState<BenchmarkResult[]>([]);
  const [currentResult, setCurrentResult] = useState<BenchmarkResult | null>(null);
  const [baselineId, setBaselineId] = useState<string | null>(null);
  const [settingsConfig, setSettingsConfig] = useState<ModelSettingsConfig | null>(null);
  const [globalSettings, setGlobalSettings] = useState<ModelSettings | null>(null);
  const [loading, setLoading] = useState(false);

  const hasModel = Boolean(selectedModelPath);

  const engine = useMemo<EngineId>(
    () => (selectedModelPath ? engineService.getEngineForModel(selectedModelPath) : 'llama.rn'),
    [selectedModelPath],
  );
  const benchmarkSupported = engine !== 'mlx';

  const benchmarkHistory = useMemo(
    () => history.filter(r => !currentResult || r.id !== currentResult.id),
    [currentResult, history],
  );
  const baseline = useMemo(
    () => benchmarkHistory.find(r => r.id === baselineId) ?? null,
    [baselineId, benchmarkHistory],
  );
  const delta = useMemo(
    () => (currentResult && baseline ? buildDelta(currentResult, baseline) : null),
    [baseline, currentResult],
  );

  useEffect(() => {
    loadStoredModels();
  }, []);

  useEffect(() => {
    if (!selectedModelPath) return;
    const load = async () => {
      setLoading(true);
      try {
        const [cfg, hist] = await Promise.all([
          modelSettingsService.getModelSettings(selectedModelPath),
          benchmarkService.getHistory(selectedModelPath),
        ]);
        setSettingsConfig(cfg);
        setGlobalSettings(llamaManager.getSettings());
        setHistory(hist);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedModelPath]);

  const resolveSettings = (): Partial<ModelSettings> => {
    const base = globalSettings ?? llamaManager.getSettings();
    if (!settingsConfig || settingsConfig.useGlobalSettings || !settingsConfig.customSettings) {
      return { ...base, maxTokens };
    }
    return { ...base, ...settingsConfig.customSettings, maxTokens };
  };

  const refreshHistory = async () => {
    if (!selectedModelPath) return;
    const hist = await benchmarkService.getHistory(selectedModelPath);
    setHistory(hist);
  };

  const runBenchmark = async () => {
    if (!benchmarkSupported) {
      Alert.alert('Unavailable', 'Benchmarking is available for GGUF and LiteRT models.');
      return;
    }
    if (!prompt.trim()) {
      Alert.alert('Prompt required', 'Enter a benchmark prompt before running the test.');
      return;
    }
    try {
      setProgress({ phase: 'loading', current: 0, total: warmupRuns + benchmarkRuns });
      let finalResult: BenchmarkResult | null = null;
      for await (const update of benchmarkService.run({
        modelPath,
        modelName,
        prompt: prompt.trim(),
        warmupRuns,
        benchmarkRuns,
        settings: resolveSettings(),
      })) {
        setProgress(update);
        if (update.result) finalResult = update.result;
      }
      setCurrentResult(finalResult);
      await refreshHistory();
    } catch (error) {
      Alert.alert('Benchmark failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setProgress(null);
    }
  };

  const shareResults = async () => {
    const rows = currentResult ? [currentResult, ...benchmarkHistory] : benchmarkHistory;
    if (rows.length === 0) {
      Alert.alert('Nothing to export', 'Run a benchmark first.');
      return;
    }
    await Share.share({ message: benchmarkService.exportCsv(rows), title: 'Benchmark Results' });
  };

  const benchmarkableModels = storedModels.filter(
    m => m.path && engineService.getEngineForModel(m.path) !== 'mlx',
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: themeColors.background }}>
        <AppHeader title="Benchmark" showBackButton showLogo={false} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={accent} />
          <Text style={[styles.loadingText, { color: themeColors.text }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!hasModel) {
    return (
      <View style={{ flex: 1, backgroundColor: themeColors.background }}>
        <AppHeader title="Benchmark" showBackButton showLogo={false} />
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.heroEmpty, { backgroundColor: themeColors.borderColor }]}>
            <View style={[styles.heroIcon, { backgroundColor: accent + '22' }]}>
              <MaterialCommunityIcons name="speedometer" size={32} color={accent} />
            </View>
            <Text style={[styles.heroTitle, { color: themeColors.text }]}>Select a model</Text>
            <Text style={[styles.heroSub, { color: themeColors.secondaryText }]}>
              Choose a local GGUF or LiteRT model to measure speed and performance.
            </Text>
          </View>

          {benchmarkableModels.length === 0 ? (
            <View style={[styles.card, { backgroundColor: themeColors.borderColor }]}>
              <Text style={[styles.emptyNote, { color: themeColors.secondaryText }]}>
                No compatible models downloaded yet.
              </Text>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: themeColors.borderColor }]}>
              {benchmarkableModels.map((m, idx) => (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.modelRow,
                    idx < benchmarkableModels.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: themeColors.secondaryText + '12',
                    },
                  ]}
                  onPress={() => {
                    setSelectedModelName(m.name);
                    setSelectedModelPath(m.path);
                  }}
                >
                  <View style={[styles.modelDot, { backgroundColor: accent + '28' }]}>
                    <MaterialCommunityIcons name="cube-outline" size={14} color={accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modelName, { color: themeColors.text }]} numberOfLines={1}>
                      {formatModelName(m.name)}
                    </Text>
                    <Text style={[styles.modelMeta, { color: themeColors.secondaryText }]}>
                      {engineLabels[engineService.getEngineForModel(m.path)]}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={themeColors.secondaryText + '80'} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <AppHeader
        title="Benchmark"
        showBackButton
        showLogo={false}
        rightButtons={
          <TouchableOpacity
            onPress={() => {
              setSelectedModelName(undefined);
              setSelectedModelPath(undefined);
              setCurrentResult(null);
              setHistory([]);
            }}
            style={{ padding: 8 }}
          >
            <MaterialCommunityIcons name="swap-horizontal" size={22} color={themeColors.text} />
          </TouchableOpacity>
        }
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: themeColors.borderColor }]}>
          <Text style={[styles.heroTitle, { color: themeColors.text }]}>{formatModelName(modelName)}</Text>
          <Text style={[styles.heroSub, { color: themeColors.secondaryText }]}>
            {engineLabels[engine]} benchmark profile
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: themeColors.borderColor }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Prompt</Text>
          <TextInput
            multiline
            value={prompt}
            onChangeText={setPrompt}
            placeholder="Enter a repeatable benchmark prompt"
            placeholderTextColor={themeColors.secondaryText}
            style={[
              styles.promptInput,
              {
                color: themeColors.text,
                borderColor: themeColors.secondaryText + '30',
                backgroundColor: currentTheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              },
            ]}
          />

          <View style={styles.counterGrid}>
            <Counter label="Warmup" value={warmupRuns} onChange={setWarmupRuns} min={0} max={10} labelColor={themeColors.secondaryText} valueColor={valueColor} accent={accent} />
            <Counter label="Runs" value={benchmarkRuns} onChange={setBenchmarkRuns} min={1} max={20} labelColor={themeColors.secondaryText} valueColor={valueColor} accent={accent} />
            <Counter label="Max Tokens" value={maxTokens} onChange={setMaxTokens} min={32} max={1024} labelColor={themeColors.secondaryText} valueColor={valueColor} accent={accent} />
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: benchmarkSupported ? accent : themeColors.secondaryText }]}
              disabled={!benchmarkSupported || Boolean(progress)}
              onPress={runBenchmark}
            >
              <MaterialCommunityIcons name="speedometer" size={18} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>{progress ? 'Running...' : 'Run Benchmark'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: themeColors.secondaryText + '30' }]}
              onPress={shareResults}
            >
              <MaterialCommunityIcons name="share-variant-outline" size={18} color={themeColors.text} />
              <Text style={[styles.secondaryBtnText, { color: themeColors.text }]}>Export CSV</Text>
            </TouchableOpacity>
          </View>

          {!benchmarkSupported && (
            <Text style={[styles.caption, { color: themeColors.secondaryText }]}>MLX benchmarking is not wired yet.</Text>
          )}
        </View>

        {progress && (
          <View style={[styles.card, { backgroundColor: themeColors.borderColor }]}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Progress</Text>
            <Text style={[styles.progressText, { color: themeColors.secondaryText }]}>
              {progress.phase.toUpperCase()} {progress.current}/{progress.total}
            </Text>
          </View>
        )}

        {currentResult && (
          <View style={[styles.card, { backgroundColor: themeColors.borderColor }]}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Latest Result</Text>
            <View style={styles.metricGrid}>
              {[
                { label: 'TTFT', value: fmt(currentResult.metrics.ttftMs.avg) + ' ms' },
                { label: 'Total', value: fmt(currentResult.metrics.totalTimeMs.avg) + ' ms' },
                { label: 'Prefill', value: fmt(currentResult.metrics.prefillTokensPerSecond.avg) + ' tok/s' },
                { label: 'Decode', value: fmt(currentResult.metrics.decodeTokensPerSecond.avg) + ' tok/s' },
              ].map(m => (
                <View key={m.label} style={styles.metricItem}>
                  <Text style={[styles.metricLabel, { color: themeColors.secondaryText }]}>{m.label}</Text>
                  <Text style={[styles.metricValue, { color: themeColors.text }]}>{m.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {currentResult && benchmarkHistory.length > 0 && (
          <View style={[styles.card, { backgroundColor: themeColors.borderColor }]}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Compare Against</Text>
            {benchmarkHistory.slice(0, 5).map(result => {
              const active = result.id === baselineId;
              return (
                <TouchableOpacity
                  key={result.id}
                  style={[
                    styles.historyItem,
                    {
                      borderColor: active ? accent : themeColors.secondaryText + '20',
                      backgroundColor: active
                        ? currentTheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                        : 'transparent',
                    },
                  ]}
                  onPress={() => setBaselineId(active ? null : result.id)}
                >
                  <Text style={[styles.historyTitle, { color: themeColors.text }]}>
                    {new Date(result.createdAt).toLocaleString()}
                  </Text>
                  <Text style={[styles.historyMeta, { color: themeColors.secondaryText }]}>
                    TTFT {fmt(result.metrics.ttftMs.avg)} ms • Decode {fmt(result.metrics.decodeTokensPerSecond.avg)} tok/s
                  </Text>
                </TouchableOpacity>
              );
            })}

            {delta && (
              <View style={styles.deltaWrap}>
                {[
                  { label: 'TTFT', val: delta.ttftMs },
                  { label: 'Total', val: delta.totalTimeMs },
                  { label: 'Prefill', val: delta.prefillTokensPerSecond },
                  { label: 'Decode', val: delta.decodeTokensPerSecond },
                ].map(d => (
                  <Text key={d.label} style={[styles.deltaText, { color: themeColors.text }]}>
                    {d.label} {fmt(d.val)}%
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {history.length > 0 && (
          <View style={[styles.card, { backgroundColor: themeColors.borderColor }]}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>History</Text>
            {history.slice(0, 8).map(result => (
              <View key={result.id} style={[styles.historyItem, { borderColor: themeColors.secondaryText + '20' }]}>
                <Text style={[styles.historyTitle, { color: themeColors.text }]}>
                  {new Date(result.createdAt).toLocaleString()}
                </Text>
                <Text style={[styles.historyMeta, { color: themeColors.secondaryText }]}>
                  {result.benchmarkRuns} runs • TTFT {fmt(result.metrics.ttftMs.avg)} ms • Decode {fmt(result.metrics.decodeTokensPerSecond.avg)} tok/s
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 16, fontSize: 15, fontWeight: '500' },
  heroEmpty: {
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroCard: {
    borderRadius: 18,
    padding: 18,
  },
  heroTitle: { fontSize: 22, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  heroSub: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  card: { borderRadius: 18, padding: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  emptyNote: { fontSize: 14 },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  modelDot: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modelName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  modelMeta: { fontSize: 12 },
  promptInput: {
    minHeight: 108,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  counterGrid: { flexDirection: 'row', gap: 12, marginTop: 14, flexWrap: 'wrap' },
  counterCard: { flex: 1, minWidth: 100 },
  counterLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counterBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  counterValue: { fontSize: 18, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
  primaryBtn: { flex: 1, minHeight: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryBtn: { minHeight: 48, borderRadius: 14, paddingHorizontal: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryBtnText: { fontSize: 14, fontWeight: '600' },
  caption: { marginTop: 10, fontSize: 13 },
  progressText: { fontSize: 14, fontWeight: '600' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricItem: { width: '47%' },
  metricLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  metricValue: { fontSize: 18, fontWeight: '700' },
  historyItem: { borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 10 },
  historyTitle: { fontSize: 14, fontWeight: '700' },
  historyMeta: { marginTop: 4, fontSize: 13 },
  deltaWrap: { marginTop: 14, gap: 6 },
  deltaText: { fontSize: 14, fontWeight: '600' },
});
