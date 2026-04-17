import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useTheme } from '../context/ThemeContext';
import { useModel } from '../context/ModelContext';
import { OnlineModelService } from '../services/OnlineModelService';
import { toolAgentService } from '../services/ToolAgentService';
import { registerTinyGardenTools, unregisterTinyGardenTools } from '../services/tools/TinyGardenTools';

type PlotStage = 'empty' | 'planted' | 'watered' | 'grown';

type Plot = {
  id: number;
  seed: string | null;
  stage: PlotStage;
};

const makePlots = (): Plot[] => Array.from({ length: 9 }, (_, index) => ({ id: index + 1, seed: null, stage: 'empty' }));

const QUICK_PROMPTS = [
  'Plant sunflower in plots 1,2,3.',
  'Water plots 1,2,3.',
  'Harvest plots 1,2,3.',
];

const parsePlots = (value: string): number[] =>
  value
    .split(/[^0-9]+/)
    .map(item => Number(item))
    .filter(item => Number.isInteger(item) && item > 0 && item <= 9);

const stageMeta = (plot: Plot) => {
  if (plot.stage === 'grown') {
    return { icon: 'flower-tulip-outline', label: plot.seed || 'Bloom', color: '#2E8B57' };
  }
  if (plot.stage === 'watered') {
    return { icon: 'water-outline', label: plot.seed || 'Watered', color: '#2B74C8' };
  }
  if (plot.stage === 'planted') {
    return { icon: 'sprout-outline', label: plot.seed || 'Seed', color: '#B56B22' };
  }
  return { icon: 'seed-outline', label: 'Empty', color: '#7A7A7A' };
};

export default function TinyGardenScreen() {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const { selectedModelPath } = useModel();

  const [plots, setPlots] = useState<Plot[]>(() => makePlots());
  const [prompt, setPrompt] = useState('Plant sunflower in plots 1,2,3.');
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('Idle');
  const [isRunning, setIsRunning] = useState(false);

  const provider = useMemo(() => {
    if (!selectedModelPath) {
      return null;
    }
    const base = OnlineModelService.getBaseProvider(selectedModelPath);
    return ['gemini', 'chatgpt', 'claude'].includes(base) ? selectedModelPath : null;
  }, [selectedModelPath]);

  const plantSeed = useCallback((seed: string, plotIds: number[]) => {
    setPlots(current =>
      current.map(plot =>
        plotIds.includes(plot.id)
          ? { ...plot, seed, stage: 'planted' }
          : plot,
      ),
    );
    return `Planted ${seed} in plots ${plotIds.join(', ')}.`;
  }, []);

  const waterPlots = useCallback((plotIds: number[]) => {
    setPlots(current =>
      current.map(plot => {
        if (!plotIds.includes(plot.id)) {
          return plot;
        }
        if (plot.stage === 'planted') {
          return { ...plot, stage: 'watered' };
        }
        if (plot.stage === 'watered') {
          return { ...plot, stage: 'grown' };
        }
        return plot;
      }),
    );
    return `Watered plots ${plotIds.join(', ')}.`;
  }, []);

  const harvestPlots = useCallback((plotIds: number[]) => {
    let harvested = 0;
    setPlots(current =>
      current.map(plot => {
        if (!plotIds.includes(plot.id)) {
          return plot;
        }
        if (plot.stage === 'grown') {
          harvested += 1;
          return { ...plot, seed: null, stage: 'empty' };
        }
        return plot;
      }),
    );
    return harvested > 0
      ? `Harvested ${harvested} ready plots.`
      : 'No selected plots were ready to harvest.';
  }, []);

  useEffect(() => {
    registerTinyGardenTools({
      onPlant: plantSeed,
      onWater: waterPlots,
      onHarvest: harvestPlots,
    });

    return () => {
      unregisterTinyGardenTools();
    };
  }, [harvestPlots, plantSeed, waterPlots]);

  const runLocalCommand = () => {
    const lower = prompt.trim().toLowerCase();

    const plantMatch = lower.match(/plant\s+([a-z0-9\- ]+)\s+(?:in\s+)?plots?\s+([\d,\sand]+)/i);
    if (plantMatch) {
      const seed = plantMatch[1].trim();
      const plotIds = parsePlots(plantMatch[2]);
      if (plotIds.length === 0) {
        throw new Error('invalid_plot_selection');
      }
      return plantSeed(seed, plotIds);
    }

    const waterMatch = lower.match(/water\s+plots?\s+([\d,\sand]+)/i);
    if (waterMatch) {
      const plotIds = parsePlots(waterMatch[1]);
      if (plotIds.length === 0) {
        throw new Error('invalid_plot_selection');
      }
      return waterPlots(plotIds);
    }

    const harvestMatch = lower.match(/harvest\s+plots?\s+([\d,\sand]+)/i);
    if (harvestMatch) {
      const plotIds = parsePlots(harvestMatch[1]);
      if (plotIds.length === 0) {
        throw new Error('invalid_plot_selection');
      }
      return harvestPlots(plotIds);
    }

    throw new Error('unknown_garden_command');
  };

  const handleRun = async () => {
    if (!prompt.trim()) {
      return;
    }

    try {
      setIsRunning(true);
      setStatus('Running');
      setResponse('');

      if (!provider) {
        const result = runLocalCommand();
        setResponse(result);
        setStatus('Done');
        return;
      }

      const result = await toolAgentService.run(
        provider,
        [
          {
            id: 'system-tiny-garden',
            role: 'system',
            content:
              'You are a tiny garden assistant. The user has plots 1 through 9. Use plant_seed, water_plots, and harvest_plots to manage the garden. Keep the final reply brief.',
          },
          {
            id: 'user-tiny-garden',
            role: 'user',
            content: prompt.trim(),
          },
        ],
        {
          temperature: 0.2,
          maxTokens: 240,
        },
        {
          onStatus: setStatus,
        },
      );
      setResponse(result.finalText || 'Garden updated.');
      setStatus('Done');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setStatus('Failed');
      Alert.alert('Tiny Garden failed', message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <AppHeader title="Tiny Garden" showBackButton showLogo={false} rightButtons={[]} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: themeColors.borderColor }]}> 
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Garden</Text>
          <View style={styles.grid}>
            {plots.map(plot => {
              const meta = stageMeta(plot);
              return (
                <View key={plot.id} style={[styles.plot, { backgroundColor: currentTheme === 'dark' ? 'rgba(255,255,255,0.04)' : '#FFFFFF' }]}> 
                  <MaterialCommunityIcons name={meta.icon as any} size={26} color={meta.color} />
                  <Text style={[styles.plotId, { color: themeColors.text }]}>Plot {plot.id}</Text>
                  <Text style={[styles.plotLabel, { color: themeColors.secondaryText }]}>{meta.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: themeColors.borderColor }]}> 
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Command</Text>
          <TextInput
            value={prompt}
            onChangeText={setPrompt}
            multiline
            placeholder="Plant rose in plots 1,2,3"
            placeholderTextColor={themeColors.secondaryText}
            style={[styles.input, { color: themeColors.text, borderColor: themeColors.secondaryText + '30' }]}
          />
          <View style={styles.quickRow}>
            {QUICK_PROMPTS.map(item => (
              <TouchableOpacity key={item} style={[styles.quickChip, { borderColor: themeColors.secondaryText + '30' }]} onPress={() => setPrompt(item)}>
                <Text style={[styles.quickChipText, { color: themeColors.text }]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: themeColors.primary }]} onPress={handleRun} disabled={isRunning}>
            {isRunning ? <ActivityIndicator color="#FFFFFF" /> : <MaterialCommunityIcons name="sprout-outline" size={18} color="#FFFFFF" />}
            <Text style={styles.primaryButtonText}>{isRunning ? 'Running...' : 'Run Garden Command'}</Text>
          </TouchableOpacity>
          <Text style={[styles.caption, { color: themeColors.secondaryText }]}>Provider: {provider || 'Local parser fallback'}</Text>
          <Text style={[styles.caption, { color: themeColors.secondaryText }]}>Status: {status}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: themeColors.borderColor }]}> 
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Result</Text>
          <Text style={[styles.responseText, { color: themeColors.text }]}>{response || 'Command results will appear here.'}</Text>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  plot: {
    width: '31%',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plotId: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
  },
  plotLabel: {
    marginTop: 4,
    fontSize: 12,
  },
  input: {
    minHeight: 108,
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
    minHeight: 72,
  },
});
