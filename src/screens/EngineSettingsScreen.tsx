import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';

import AppHeader from '../components/AppHeader';
import LlamaCppIcon from '../components/icons/LlamaCppIcon';
import Dialog from '../components/Dialog';
import ModelSettingDialog from '../components/ModelSettingDialog';
import StopWordsDialog from '../components/StopWordsDialog';
import ModelSettingsAdvanced from '../components/settings/ModelSettingsAdvanced';
import ModelSettingsControls from '../components/settings/ModelSettingsControls';
import ModelSettingsDry from '../components/settings/ModelSettingsDry';
import ModelSettingsMirostat from '../components/settings/ModelSettingsMirostat';
import ModelSettingsModals from '../components/settings/ModelSettingsModals';
import ModelSettingsPenalties from '../components/settings/ModelSettingsPenalties';
import ModelSettingsSampling from '../components/settings/ModelSettingsSampling';
import { DEFAULT_SETTINGS } from '../config/llamaConfig';
import { getEngineSettingsMeta } from '../config/engineSettings';
import { theme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import type { EngineId } from '../managers/inference-manager';
import type { GpuConfig } from '../components/settings/ModelSettingsCore';
import type { ModelSettings } from '../services/ModelSettingsService';
import { modelSettingsService } from '../services/ModelSettingsService';
import {
  gpuSettingsService,
  GPU_LAYER_MIN,
  GPU_LAYER_MAX,
  DEFAULT_GPU_LAYERS,
  type GpuSettings,
} from '../services/GpuSettingsService';
import { RootStackParamList } from '../types/navigation';
import { checkGpuSupport, type GpuSupport } from '../utils/gpuCapabilities';
import { llamaManager } from '../utils/LlamaManager';

type RouteName = 'LlamaCppSettings' | 'MlxSettings' | 'LiteRTSettings';
type SharedRoute =
  | RouteProp<RootStackParamList, 'LlamaCppSettings'>
  | RouteProp<RootStackParamList, 'MlxSettings'>
  | RouteProp<RootStackParamList, 'LiteRTSettings'>;

type SharedNavigation = NativeStackNavigationProp<RootStackParamList>;

type DialogSettingConfig = {
  key?: keyof ModelSettings;
  label: string;
  value: number;
  defaultValue?: number;
  minimumValue: number;
  maximumValue: number;
  step: number;
  description: string;
  onSave?: (value: number) => Promise<void> | void;
};

type EngineSettingsProps = {
  engine: EngineId;
  navigation: SharedNavigation;
  route: SharedRoute;
};

const cleanModelName = (value?: string): string =>
  (value || '')
    .replace(/\.(gguf|litertlm|task|safetensors|json)$/i, '')
    .trim();

function EngineSettingsView({ engine, route }: EngineSettingsProps) {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const meta = getEngineSettingsMeta(engine);
  const modelName = cleanModelName(route.params?.modelName);
  const modelPath = route.params?.modelPath;
  const isPerModel = Boolean(modelPath);
  const showLlamaHardware = engine === 'llama' && !isPerModel;

  const [settings, setSettings] = useState<ModelSettings>(llamaManager.getSettings());
  const [globalSettings, setGlobalSettings] = useState<ModelSettings>(llamaManager.getSettings());
  const [isLoading, setIsLoading] = useState(Boolean(modelPath));
  const [error, setError] = useState<string | null>(null);
  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    setting?: DialogSettingConfig;
  }>({ visible: false });
  const [showStopWords, setShowStopWords] = useState(false);
  const [showGrammarDialog, setShowGrammarDialog] = useState(false);
  const [showSeedDialog, setShowSeedDialog] = useState(false);
  const [showNProbsDialog, setShowNProbsDialog] = useState(false);
  const [showLogitBiasDialog, setShowLogitBiasDialog] = useState(false);
  const [showDrySeqDialog, setShowDrySeqDialog] = useState(false);
  const [tempGrammar, setTempGrammar] = useState('');
  const [tempSeed, setTempSeed] = useState('');
  const [tempNProbs, setTempNProbs] = useState('');
  const [tempLogitBias, setTempLogitBias] = useState('');
  const [tempDrySeq, setTempDrySeq] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');
  const [noExtraBuffers, setNoExtraBuffers] = useState<boolean>(llamaManager.getNoExtraBuffers());
  const [gpuSettings, setGpuSettings] = useState<GpuSettings>(gpuSettingsService.getSettingsSync());
  const [gpuSupport, setGpuSupport] = useState<GpuSupport | null>(null);

  const defaultSettings = isPerModel ? globalSettings : DEFAULT_SETTINGS;

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      const loadState = async () => {
        setIsLoading(Boolean(modelPath));

        try {
          const nextGlobal = llamaManager.getSettings();
          if (!active) {
            return;
          }

          setGlobalSettings(nextGlobal);

          if (modelPath) {
            const config = await modelSettingsService.getModelSettings(modelPath);
            if (!active) {
              return;
            }
            setSettings(config.customSettings ?? nextGlobal);
          } else {
            setSettings(nextGlobal);
          }

          if (showLlamaHardware) {
            setNoExtraBuffers(llamaManager.getNoExtraBuffers());
            const [nextGpuSettings, nextGpuSupport] = await Promise.all([
              gpuSettingsService.loadSettings().catch(() => gpuSettingsService.getSettingsSync()),
              checkGpuSupport().catch((): GpuSupport => ({ isSupported: false, reason: 'unknown' })),
            ]);

            if (!active) {
              return;
            }

            setGpuSettings(nextGpuSettings);
            setGpuSupport(nextGpuSupport);

            if (!nextGpuSupport.isSupported && nextGpuSettings.enabled) {
              setGpuSettings(prev => ({ ...prev, enabled: false }));
              gpuSettingsService.setEnabled(false).catch(() => {});
            }
          }
        } finally {
          if (active) {
            setIsLoading(false);
          }
        }
      };

      loadState();

      return () => {
        active = false;
      };
    }, [modelPath, showLlamaHardware])
  );

  const gpuConfig = useMemo<GpuConfig | undefined>(() => {
    if (!showLlamaHardware || (Platform.OS !== 'ios' && Platform.OS !== 'android')) {
      return undefined;
    }

    const fallback: GpuSupport = Platform.OS === 'ios'
      ? { isSupported: true }
      : { isSupported: true, reason: 'unknown' };
    const support = gpuSupport ?? fallback;

    const label = Platform.OS === 'ios' ? 'Metal Acceleration' : 'OpenCL Acceleration';
    let description = Platform.OS === 'ios'
      ? 'Run transformer layers on the Apple Metal GPU to reduce CPU usage.'
      : 'Offload transformer layers to your device GPU via OpenCL.';

    if (!support.isSupported) {
      switch (support.reason) {
        case 'ios_version':
          description = 'Requires iOS 18 or newer to use Metal acceleration.';
          break;
        case 'no_adreno':
          description = 'Requires an Adreno GPU to enable OpenCL acceleration.';
          break;
        case 'missing_cpu_features':
          description = 'This CPU has missing required features for acceleration.';
          break;
        default:
          description = 'GPU acceleration is not available on this device.';
      }
    } else if (support.reason === 'unknown' && Platform.OS === 'android') {
      description = 'Attempts to use OpenCL for faster inference. Capability check is inconclusive.';
    }

    return {
      label,
      description,
      enabled: support.isSupported ? gpuSettings.enabled : false,
      supported: support.isSupported,
      value: gpuSettings.layers,
      defaultValue: DEFAULT_GPU_LAYERS,
      min: GPU_LAYER_MIN,
      max: GPU_LAYER_MAX,
      reason: support.reason,
    };
  }, [gpuSettings.enabled, gpuSettings.layers, gpuSupport, showLlamaHardware]);

  const samplingVisibility = useMemo(
    () => ({
      showMaxTokens: true,
      showTemperature: true,
      showTopP: engine !== 'mlx',
      showTopK: engine !== 'mlx',
      showMinP: engine === 'llama',
      showXtc: engine === 'llama',
      showTypicalP: engine === 'llama',
      showCountThinkingTokens: engine !== 'litert',
      showNoExtraBuffers: showLlamaHardware,
      showGpu: showLlamaHardware,
    }),
    [engine, showLlamaHardware]
  );

  const controlsVisibility = useMemo(
    () => ({
      showStopWords: engine === 'llama',
      showJinja: engine === 'llama',
      showGrammar: engine === 'llama',
      showEnableThinking: engine === 'llama' || engine === 'mlx',
    }),
    [engine]
  );

  const showAlert = (title: string, message: string) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogVisible(true);
  };

  const getDefaultValue = (key?: keyof ModelSettings): number | undefined => {
    if (!key) {
      return undefined;
    }

    const value = defaultSettings[key];
    return typeof value === 'number' ? value : undefined;
  };

  const persistSettings = async (updated: ModelSettings) => {
    if (modelPath) {
      await modelSettingsService.setCustomSettings(modelPath, updated);
      return;
    }

    await llamaManager.updateSettings(updated);
  };

  const handleChange = async (partial: Partial<ModelSettings>) => {
    const previous = settings;
    const updated = { ...settings, ...partial };

    if ('maxTokens' in partial) {
      if (updated.maxTokens < 1 || updated.maxTokens > 4096) {
        setError('Max tokens must be between 1 and 4096');
        return;
      }
    }

    setError(null);
    setSettings(updated);

    try {
      await persistSettings(updated);
    } catch {
      setSettings(previous);
      showAlert('Error', 'Failed to save setting');
    }
  };

  const handleOpenDialog = (config: DialogSettingConfig) => {
    const inferredDefault =
      config.defaultValue !== undefined
        ? config.defaultValue
        : getDefaultValue(config.key);

    setDialogConfig({
      visible: true,
      setting: {
        ...config,
        defaultValue: typeof inferredDefault === 'number' ? inferredDefault : config.value,
      },
    });
  };

  const handleCloseDialog = () => {
    setDialogConfig({ visible: false });
  };

  const handleGpuToggle = async (enabled: boolean) => {
    const previous = gpuSettings.enabled;
    setGpuSettings(prev => ({ ...prev, enabled }));

    try {
      await gpuSettingsService.setEnabled(enabled);
    } catch {
      setGpuSettings(prev => ({ ...prev, enabled: previous }));
      showAlert('Error', 'Failed to save setting');
    }
  };

  const handleNoExtraBuffersToggle = async (enabled: boolean) => {
    const previous = noExtraBuffers;
    setNoExtraBuffers(enabled);

    try {
      await llamaManager.setNoExtraBuffers(enabled);
    } catch {
      setNoExtraBuffers(previous);
      showAlert('Error', 'Failed to save setting');
    }
  };

  const maxTokensDialog = {
    key: 'maxTokens' as const,
    label: 'Max Response Tokens',
    value: settings.maxTokens,
    defaultValue: getDefaultValue('maxTokens') ?? DEFAULT_SETTINGS.maxTokens,
    minimumValue: 1,
    maximumValue: 4096,
    step: 1,
    description: 'Maximum number of tokens in model responses.',
  };

  const bannerText = isPerModel && modelName
    ? meta.modelSummary(modelName)
    : meta.globalSummary;

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: themeColors.background }}>
        <AppHeader title={meta.title} showBackButton showLogo={false} rightButtons={[]} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.text }]}>Loading settings...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <AppHeader title={meta.title} showBackButton showLogo={false} rightButtons={[]} />

      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.noticeCard,
            {
              backgroundColor: currentTheme === 'dark' ? 'rgba(255,255,255,0.08)' : (meta.accentColor ?? themeColors.primary) + '12',
              borderColor: currentTheme === 'dark' ? 'rgba(255,255,255,0.12)' : (meta.accentColor ?? themeColors.primary) + '28',
            },
          ]}
        >
          <View style={[styles.noticeIcon, { backgroundColor: currentTheme === 'dark' ? 'rgba(255,255,255,0.16)' : (meta.accentColor ?? themeColors.primary) + '20' }]}>
            {meta.iconKey === 'llama-cpp' ? (
              <LlamaCppIcon size={20} color={currentTheme === 'dark' ? '#FFFFFF' : (meta.accentColor ?? themeColors.primary)} />
            ) : (
              <MaterialCommunityIcons
                name={meta.iconName}
                size={20}
                color={currentTheme === 'dark' ? '#FFFFFF' : (meta.accentColor ?? themeColors.primary)}
              />
            )}
          </View>
          <View style={styles.noticeContent}>
            <View style={styles.noticeHeader}>
              <Text style={[styles.noticeTitle, { color: themeColors.text }]}>{meta.entryLabel}</Text>
              <View style={[styles.noticeBadge, { backgroundColor: currentTheme === 'dark' ? 'rgba(255,255,255,0.16)' : (meta.accentColor ?? themeColors.primary) + '20' }]}>
                <Text style={[styles.noticeBadgeText, { color: currentTheme === 'dark' ? '#FFFFFF' : (meta.accentColor ?? themeColors.primary) }]}>{meta.badgeLabel}</Text>
              </View>
            </View>
            {modelName ? (
              <Text style={[styles.noticeModelName, { color: themeColors.text }]}>{modelName}</Text>
            ) : null}
            <Text style={[styles.noticeText, { color: themeColors.secondaryText }]}>{bannerText}</Text>
          </View>
        </View>

        <ModelSettingsSampling
          modelSettings={settings}
          defaultSettings={defaultSettings}
          error={error}
          onSettingsChange={handleChange}
          onMaxTokensPress={() => handleOpenDialog(maxTokensDialog)}
          onDialogOpen={handleOpenDialog}
          noExtraBuffers={showLlamaHardware ? noExtraBuffers : undefined}
          onToggleNoExtraBuffers={showLlamaHardware ? handleNoExtraBuffersToggle : undefined}
          gpuConfig={showLlamaHardware ? gpuConfig : undefined}
          onToggleGpu={showLlamaHardware ? handleGpuToggle : undefined}
          visibility={samplingVisibility}
        />

        <ModelSettingsControls
          modelSettings={settings}
          defaultSettings={defaultSettings}
          onSettingsChange={handleChange}
          onStopWordsPress={() => setShowStopWords(true)}
          onGrammarDialogOpen={() => {
            setTempGrammar(settings.grammar);
            setShowGrammarDialog(true);
          }}
          visibility={controlsVisibility}
        />

        {engine === 'llama' ? (
          <>
            <ModelSettingsPenalties
              modelSettings={settings}
              defaultSettings={defaultSettings}
              onSettingsChange={handleChange}
              onDialogOpen={handleOpenDialog}
            />

            <ModelSettingsMirostat
              modelSettings={settings}
              defaultSettings={defaultSettings}
              onSettingsChange={handleChange}
              onDialogOpen={handleOpenDialog}
            />

            <ModelSettingsDry
              modelSettings={settings}
              defaultSettings={defaultSettings}
              onSettingsChange={handleChange}
              onDialogOpen={handleOpenDialog}
              onDrySequenceBreakersDialogOpen={() => {
                setTempDrySeq((settings.drySequenceBreakers || []).join('\n'));
                setShowDrySeqDialog(true);
              }}
            />

            <ModelSettingsAdvanced
              modelSettings={settings}
              defaultSettings={defaultSettings}
              onSettingsChange={handleChange}
              onNProbsDialogOpen={() => {
                setTempNProbs((settings.nProbs ?? 0).toString());
                setShowNProbsDialog(true);
              }}
              onSeedDialogOpen={() => {
                setTempSeed((settings.seed ?? -1).toString());
                setShowSeedDialog(true);
              }}
              onLogitBiasDialogOpen={() => {
                const text = (settings.logitBias || [])
                  .map(([id, bias]) => `${id}, ${bias}`)
                  .join('\n');
                setTempLogitBias(text);
                setShowLogitBiasDialog(true);
              }}
            />
          </>
        ) : null}
      </ScrollView>

      {engine === 'llama' ? (
        <>
          <ModelSettingsModals
            modelSettings={settings}
            defaultSettings={defaultSettings}
            onSettingsChange={handleChange}
            showGrammarDialog={showGrammarDialog}
            setShowGrammarDialog={setShowGrammarDialog}
            showSeedDialog={showSeedDialog}
            setShowSeedDialog={setShowSeedDialog}
            showNProbsDialog={showNProbsDialog}
            setShowNProbsDialog={setShowNProbsDialog}
            showLogitBiasDialog={showLogitBiasDialog}
            setShowLogitBiasDialog={setShowLogitBiasDialog}
            showDrySequenceBreakersDialog={showDrySeqDialog}
            setShowDrySequenceBreakersDialog={setShowDrySeqDialog}
            tempGrammar={tempGrammar}
            setTempGrammar={setTempGrammar}
            tempSeed={tempSeed}
            setTempSeed={setTempSeed}
            tempNProbs={tempNProbs}
            setTempNProbs={setTempNProbs}
            tempLogitBias={tempLogitBias}
            setTempLogitBias={setTempLogitBias}
            tempDrySequenceBreakers={tempDrySeq}
            setTempDrySequenceBreakers={setTempDrySeq}
          />

          <StopWordsDialog
            visible={showStopWords}
            onClose={() => setShowStopWords(false)}
            onSave={(stopWords) => {
              handleChange({ stopWords });
              setShowStopWords(false);
            }}
            value={settings.stopWords}
            defaultValue={defaultSettings.stopWords}
            description="Enter words that will cause the model to stop generating. Each word should be on a new line."
          />
        </>
      ) : null}

      {dialogConfig.setting ? (
        <ModelSettingDialog
          key={dialogConfig.setting.key ?? dialogConfig.setting.label}
          visible={dialogConfig.visible}
          onClose={handleCloseDialog}
          onSave={async (value) => {
            if (!dialogConfig.setting) {
              return;
            }

            try {
              if (dialogConfig.setting.onSave) {
                await dialogConfig.setting.onSave(value);
              } else if (dialogConfig.setting.key) {
                await handleChange({ [dialogConfig.setting.key]: value } as Partial<ModelSettings>);
              }
              handleCloseDialog();
            } catch {
              showAlert('Error', 'Failed to save setting');
            }
          }}
          defaultValue={
            dialogConfig.setting.defaultValue ??
            getDefaultValue(dialogConfig.setting.key) ??
            dialogConfig.setting.value
          }
          label={dialogConfig.setting.label}
          value={dialogConfig.setting.value}
          minimumValue={dialogConfig.setting.minimumValue}
          maximumValue={dialogConfig.setting.maximumValue}
          step={dialogConfig.setting.step}
          description={dialogConfig.setting.description}
        />
      ) : null}

      <Dialog
        visible={dialogVisible}
        onDismiss={() => setDialogVisible(false)}
        title={dialogTitle || undefined}
        description={dialogMessage || undefined}
        buttonText="OK"
        onClose={() => setDialogVisible(false)}
      />
    </View>
  );
}

type RouteProps<T extends RouteName> = NativeStackScreenProps<RootStackParamList, T>;

export function LlamaCppSettingsScreen(props: RouteProps<'LlamaCppSettings'>) {
  return <EngineSettingsView {...props} engine="llama" />;
}

export function MlxSettingsScreen(props: RouteProps<'MlxSettings'>) {
  return <EngineSettingsView {...props} engine="mlx" />;
}

export function LiteRTSettingsScreen(props: RouteProps<'LiteRTSettings'>) {
  return <EngineSettingsView {...props} engine="litert" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  noticeCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  noticeIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  noticeContent: {
    flex: 1,
  },
  noticeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  noticeTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  noticeBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  noticeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  noticeModelName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 18,
  },
});