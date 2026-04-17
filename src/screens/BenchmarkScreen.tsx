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
import { NavigationProp, RouteProp, useNavigation, useRoute } from '@react-navigation/native';

import AppHeader from '../components/AppHeader';
import { theme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import type { ModelSettings, ModelSettingsConfig } from '../services/ModelSettingsService';
import { modelSettingsService } from '../services/ModelSettingsService';
import { benchmarkService } from '../services/BenchmarkService';
import type { BenchmarkDelta, BenchmarkProgress, BenchmarkResult } from '../types/benchmark';
import { RootStackParamList } from '../types/navigation';
import { engineLabels, type EngineId } from '../managers/inference-manager';
import { engineService } from '../services/inference-engine-service';
import { llamaManager } from '../utils/LlamaManager';

const DEFAULT_PROMPT = 'Explain how transformer attention works in two concise paragraphs.';

type BenchmarkScreenRouteProp = RouteProp<RootStackParamList, 'Benchmark'>;

const formatNumber = (value: number, digits = 2) => value.toFixed(digits);

const formatModelName = (value: string) => value.replace(/\.(gguf|litertlm|task)$/i, '');

const metricDelta = (current: number, baseline: number, lowerIsBetter = false): number => {
  if (!baseline) {
    return 0;
  }

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

function CounterField({
  label,
  value,
  onChange,
  min,
  max,
  labelColor,
  valueColor,
  accentColor,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  labelColor: string;
  valueColor: string;
  accentColor: string;
}) {
  return (
    <View style={styles.counterCard}>
      <Text style={[styles.counterLabel, { color: labelColor }]}>{label}</Text>
      <View style={styles.counterRow}>
        <TouchableOpacity style={[styles.counterButton, { backgroundColor: accentColor }]} onPress={() => onChange(Math.max(min, value - 1))}>
          <MaterialCommunityIcons name="minus" size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.counterValue, { color: valueColor }]}>{value}</Text>
        <TouchableOpacity style={[styles.counterButton, { backgroundColor: accentColor }]} onPress={() => onChange(Math.min(max, value + 1))}>
          <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function BenchmarkScreen() {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<BenchmarkScreenRouteProp>();
  const { modelName, modelPath } = route.params;
  const accentColor = currentTheme === 'dark' ? '#2E8B57' : '#1C6B4A';
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
  const [loading, setLoading] = useState(true);

  const engine = useMemo<EngineId>(() => engineService.getEngineForModel(modelPath), [modelPath]);
  const benchmarkSupported = engine !== 'mlx';
  const benchmarkHistory = useMemo(
    () => history.filter(result => !currentResult || result.id !== currentResult.id),
    [currentResult, history],
  );
  const baseline = useMemo(
    () => benchmarkHistory.find(result => result.id === baselineId) ?? null,
    [baselineId, benchmarkHistory],
  );
  const delta = useMemo(
    () => (currentResult && baseline ? buildDelta(currentResult, baseline) : null),
    [baseline, currentResult],
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [storedConfig, storedHistory] = await Promise.all([
          modelSettingsService.getModelSettings(modelPath),
          benchmarkService.getHistory(modelPath),
        ]);
        setSettingsConfig(storedConfig);
        setGlobalSettings(llamaManager.getSettings());
        setHistory(storedHistory);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [modelPath]);

  const resolveSettings = (): Partial<ModelSettings> => {
    const baseSettings = globalSettings ?? llamaManager.getSettings();
    if (!settingsConfig || settingsConfig.useGlobalSettings || !settingsConfig.customSettings) {
      return {
        ...baseSettings,
        maxTokens,
      };
    }

    return {
      ...baseSettings,
      ...settingsConfig.customSettings,
      maxTokens,
    };
  };

  const refreshHistory = async () => {
    const storedHistory = await benchmarkService.getHistory(modelPath);
    setHistory(storedHistory);
  };

  const runBenchmark = async () => {
    if (!benchmarkSupported) {
      Alert.alert('Unavailable', 'Benchmarking is currently available for GGUF and LiteRT models.');
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
        if (update.result) {
          finalResult = update.result;
        }
      }

      setCurrentResult(finalResult);
      await refreshHistory();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Benchmark failed';
      Alert.alert('Benchmark failed', message);
    } finally {
      setProgress(null);
    }
  };

  const shareResults = async () => {
    const exportResults = currentResult ? [currentResult, ...benchmarkHistory] : benchmarkHistory;
    if (exportResults.length === 0) {
      Alert.alert('Nothing to export', 'Run a benchmark first to export results.');
      return;
    }

    await Share.share({
      message: benchmarkService.exportCsv(exportResults),
      title: 'Benchmark Results',
    });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: themeColors.background }}>
        <AppHeader title="Benchmark" showBackButton showLogo={false} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.text }]}>Loading benchmark tools...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <AppHeader title="Benchmark" showBackButton showLogo={false} rightButtons={[]} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={[styles.heroCard, { backgroundColor: themeColors.borderColor }]}> 
          <Text style={[styles.modelName, { color: themeColors.text }]}>{formatModelName(modelName)}</Text>
          <Text style={[styles.engineText, { color: themeColors.secondaryText }]}>
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
            <CounterField
              label="Warmup"
              value={warmupRuns}
              onChange={setWarmupRuns}
              min={0}
              max={10}
              labelColor={themeColors.secondaryText}
              valueColor={valueColor}
              accentColor={accentColor}
            />
            <CounterField
              label="Runs"
              value={benchmarkRuns}
              onChange={setBenchmarkRuns}
              min={1}
              max={20}
              labelColor={themeColors.secondaryText}
              valueColor={valueColor}
              accentColor={accentColor}
            />
            <CounterField
              label="Max Tokens"
              value={maxTokens}
              onChange={setMaxTokens}
              min={32}
              max={1024}
              labelColor={themeColors.secondaryText}
              valueColor={valueColor}
              accentColor={accentColor}
            />
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: benchmarkSupported ? themeColors.primary : themeColors.secondaryText },
              ]}
              disabled={!benchmarkSupported || Boolean(progress)}
              onPress={runBenchmark}
            >
              <MaterialCommunityIcons name="speedometer" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>{progress ? 'Running...' : 'Run Benchmark'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: themeColors.secondaryText + '30' }]}
              onPress={shareResults}
            >
              <MaterialCommunityIcons name="share-variant-outline" size={18} color={themeColors.text} />
              <Text style={[styles.secondaryButtonText, { color: themeColors.text }]}>Export CSV</Text>
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
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: themeColors.secondaryText }]}>TTFT</Text>
                <Text style={[styles.metricValue, { color: themeColors.text }]}>{formatNumber(currentResult.metrics.ttftMs.avg)} ms</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: themeColors.secondaryText }]}>Total</Text>
                <Text style={[styles.metricValue, { color: themeColors.text }]}>{formatNumber(currentResult.metrics.totalTimeMs.avg)} ms</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: themeColors.secondaryText }]}>Prefill</Text>
                <Text style={[styles.metricValue, { color: themeColors.text }]}>{formatNumber(currentResult.metrics.prefillTokensPerSecond.avg)} tok/s</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: themeColors.secondaryText }]}>Decode</Text>
                <Text style={[styles.metricValue, { color: themeColors.text }]}>{formatNumber(currentResult.metrics.decodeTokensPerSecond.avg)} tok/s</Text>
              </View>
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
                      borderColor: active ? themeColors.primary : themeColors.secondaryText + '20',
                      backgroundColor: active
                        ? currentTheme === 'dark'
                          ? 'rgba(255,255,255,0.05)'
                          : 'rgba(0,0,0,0.03)'
                        : 'transparent',
                    },
                  ]}
                  onPress={() => setBaselineId(active ? null : result.id)}
                >
                  <Text style={[styles.historyTitle, { color: themeColors.text }]}>
                    {new Date(result.createdAt).toLocaleString()}
                  </Text>
                  <Text style={[styles.historyMeta, { color: themeColors.secondaryText }]}> 
                    TTFT {formatNumber(result.metrics.ttftMs.avg)} ms • Decode {formatNumber(result.metrics.decodeTokensPerSecond.avg)} tok/s
                  </Text>
                </TouchableOpacity>
              );
            })}

            {delta && (
              <View style={styles.deltaWrap}>
                <Text style={[styles.deltaText, { color: themeColors.text }]}>TTFT {formatNumber(delta.ttftMs)}%</Text>
                <Text style={[styles.deltaText, { color: themeColors.text }]}>Total {formatNumber(delta.totalTimeMs)}%</Text>
                <Text style={[styles.deltaText, { color: themeColors.text }]}>Prefill {formatNumber(delta.prefillTokensPerSecond)}%</Text>
                <Text style={[styles.deltaText, { color: themeColors.text }]}>Decode {formatNumber(delta.decodeTokensPerSecond)}%</Text>
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
                  {result.benchmarkRuns} runs • TTFT {formatNumber(result.metrics.ttftMs.avg)} ms • Decode {formatNumber(result.metrics.decodeTokensPerSecond.avg)} tok/s
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
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '500',
  },
  heroCard: {
    borderRadius: 18,
    padding: 18,
  },
  modelName: {
    fontSize: 24,
    fontWeight: '700',
  },
  engineText: {
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
  promptInput: {
    minHeight: 108,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  counterGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  counterCard: {
    flex: 1,
    minWidth: 100,
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
  actionRow: {
    flexDirection: 'row',
    gap: 12,
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
    borderRadius: 14,
    paddingHorizontal: 16,
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
  caption: {
    marginTop: 10,
    fontSize: 13,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricItem: {
    width: '47%',
  },
  metricLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
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
  deltaWrap: {
    marginTop: 14,
    gap: 6,
  },
  deltaText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
