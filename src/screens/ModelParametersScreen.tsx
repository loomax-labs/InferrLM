/*
  Dedicated screen for advanced model parameters (sampling, controls,
  penalties, mirostat, DRY, and other advanced knobs).  Navigated to
  from the Model Settings section on the Settings screen.
*/
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Text, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../constants/theme';
import { llamaManager } from '../utils/LlamaManager';
import { DEFAULT_SETTINGS } from '../config/llamaConfig';
import type { ModelSettings } from '../services/ModelSettingsService';
import type { GpuConfig } from '../components/settings/ModelSettingsCore';
import {
  gpuSettingsService,
  GPU_LAYER_MIN,
  GPU_LAYER_MAX,
  DEFAULT_GPU_LAYERS,
  type GpuSettings,
} from '../services/GpuSettingsService';
import { checkGpuSupport, type GpuSupport } from '../utils/gpuCapabilities';
import AppHeader from '../components/AppHeader';
import ModelSettingDialog from '../components/ModelSettingDialog';
import StopWordsDialog from '../components/StopWordsDialog';
import ModelSettingsSampling from '../components/settings/ModelSettingsSampling';
import ModelSettingsControls from '../components/settings/ModelSettingsControls';
import ModelSettingsPenalties from '../components/settings/ModelSettingsPenalties';
import ModelSettingsMirostat from '../components/settings/ModelSettingsMirostat';
import ModelSettingsDry from '../components/settings/ModelSettingsDry';
import ModelSettingsAdvanced from '../components/settings/ModelSettingsAdvanced';
import ModelSettingsModals from '../components/settings/ModelSettingsModals';
import Dialog from '../components/Dialog';

type ModelSettingKey = keyof ModelSettings;

type DialogSettingConfig = {
  key?: ModelSettingKey;
  label: string;
  value: number;
  defaultValue?: number;
  minimumValue: number;
  maximumValue: number;
  step: number;
  description: string;
  onSave?: (value: number) => Promise<void> | void;
};

export default function ModelParametersScreen() {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const router = useRouter();
  const { modelName } = useLocalSearchParams<{ modelName?: string }>();
  const isPerModel = !!modelName;

  const [settings, setSettings] = useState<ModelSettings>(
    llamaManager.getSettings(),
  );
  const [error, setError] = useState<string | null>(null);
  const [noExtraBuffers, setNoExtraBuffers] = useState<boolean>(
    llamaManager.getNoExtraBuffers()
  );
  const showMlxWarning = !isPerModel && Platform.OS === 'ios';

  const [gpuSettings, setGpuSettings] = useState<GpuSettings>(
    gpuSettingsService.getSettingsSync()
  );
  const [gpuSupport, setGpuSupport] = useState<GpuSupport | null>(null);

  useEffect(() => {
    let active = true;
    gpuSettingsService.loadSettings().then(s => { if (active) setGpuSettings(s); }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    checkGpuSupport().then(s => { if (active) setGpuSupport(s); }).catch(() => {
      if (active) setGpuSupport({ isSupported: false, reason: 'unknown' });
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (gpuSupport && !gpuSupport.isSupported && gpuSettings.enabled) {
      setGpuSettings(prev => ({ ...prev, enabled: false }));
      gpuSettingsService.setEnabled(false).catch(() => {});
    }
  }, [gpuSupport, gpuSettings.enabled]);

  const gpuConfig = React.useMemo<GpuConfig | undefined>(() => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return undefined;

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
  }, [gpuSupport, gpuSettings.enabled, gpuSettings.layers]);

  const handleGpuToggle = async (enabled: boolean) => {
    const previous = gpuSettings.enabled;
    setGpuSettings(prev => ({ ...prev, enabled }));
    try {
      await gpuSettingsService.setEnabled(enabled);
    } catch {
      setGpuSettings(prev => ({ ...prev, enabled: previous }));
    }
  };

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

  useFocusEffect(
    React.useCallback(() => {
      setSettings(llamaManager.getSettings());
    }, []),
  );

  const getDefault = (key?: ModelSettingKey): number | undefined => {
    if (!key) return undefined;
    const val = (DEFAULT_SETTINGS as unknown as Record<string, unknown>)[key];
    return typeof val === 'number' ? val : undefined;
  };

  const handleChange = async (partial: Partial<ModelSettings>) => {
    try {
      const updated = { ...settings, ...partial };
      if ('maxTokens' in partial) {
        const t = updated.maxTokens;
        if (t < 1 || t > 4096) {
          setError('Max tokens must be between 1 and 4096');
          return;
        }
      }
      setError(null);
      setSettings(updated);
      await llamaManager.updateSettings(updated);
    } catch (_) {
      showAlert('Error', 'Failed to save setting');
    }
  };

  const showAlert = (title: string, message: string) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogVisible(true);
  };

  const handleOpenDialog = (config: DialogSettingConfig) => {
    const inferred =
      config.defaultValue !== undefined
        ? config.defaultValue
        : getDefault(config.key);
    setDialogConfig({
      visible: true,
      setting: {
        ...config,
        defaultValue: typeof inferred === 'number' ? inferred : config.value,
      },
    });
  };

  const handleCloseDialog = () => setDialogConfig({ visible: false });

  const handleMaxTokens = () => {
    handleOpenDialog({
      key: 'maxTokens',
      label: 'Max Response Tokens',
      value: settings.maxTokens,
      defaultValue: DEFAULT_SETTINGS.maxTokens,
      minimumValue: 1,
      maximumValue: 4096,
      step: 1,
      description:
        'Maximum number of tokens in model responses.',
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <AppHeader         
      title="AI Content Terms"
              leftComponent={
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => router.back()}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialCommunityIcons name="arrow-left" size={24} color={Platform.OS === 'ios' && currentTheme === 'light' ? themeColors.primary : themeColors.headerText} />
                </TouchableOpacity>
              }
              rightButtons={[]}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[
          styles.noticeBanner,
          {
            backgroundColor: currentTheme === 'dark' ? 'rgba(255,176,0,0.1)' : 'rgba(255,152,0,0.08)',
            borderColor: currentTheme === 'dark' ? 'rgba(255,176,0,0.25)' : 'rgba(255,152,0,0.3)',
          },
        ]}>
          <MaterialCommunityIcons
            name="information-outline"
            size={16}
            color={currentTheme === 'dark' ? '#FFB300' : '#E65100'}
          />
          <Text style={[styles.noticeText, { color: currentTheme === 'dark' ? '#FFB300' : '#E65100' }]}>
            {isPerModel
              ? `Currently applying to: ${modelName.replace('.gguf', '')}`
              : Platform.OS === 'android'
                ? 'These settings do not apply to remote/cloud models.'
                : 'These settings do not apply to Apple Intelligence or remote/cloud models.'}
          </Text>
        </View>

        <ModelSettingsSampling
          modelSettings={settings}
          defaultSettings={DEFAULT_SETTINGS}
          error={error}
          onSettingsChange={handleChange}
          onMaxTokensPress={handleMaxTokens}
          onDialogOpen={handleOpenDialog}
          showMlxWarning={showMlxWarning}
          noExtraBuffers={noExtraBuffers}
          onToggleNoExtraBuffers={async (enabled) => {
            setNoExtraBuffers(enabled);
            await llamaManager.setNoExtraBuffers(enabled);
          }}
          gpuConfig={gpuConfig}
          onToggleGpu={handleGpuToggle}
        />

        <ModelSettingsControls
          modelSettings={settings}
          defaultSettings={DEFAULT_SETTINGS}
          onSettingsChange={handleChange}
          onStopWordsPress={() => setShowStopWords(true)}
          onGrammarDialogOpen={() => {
            setTempGrammar(settings.grammar);
            setShowGrammarDialog(true);
          }}
          showMlxWarning={showMlxWarning}
        />

        <ModelSettingsPenalties
          modelSettings={settings}
          defaultSettings={DEFAULT_SETTINGS}
          onSettingsChange={handleChange}
          onDialogOpen={handleOpenDialog}
        />

        <ModelSettingsMirostat
          modelSettings={settings}
          defaultSettings={DEFAULT_SETTINGS}
          onSettingsChange={handleChange}
          onDialogOpen={handleOpenDialog}
          showMlxWarning={showMlxWarning}
        />

        <ModelSettingsDry
          modelSettings={settings}
          defaultSettings={DEFAULT_SETTINGS}
          onSettingsChange={handleChange}
          onDialogOpen={handleOpenDialog}
          onDrySequenceBreakersDialogOpen={() => {
            setTempDrySeq((settings.drySequenceBreakers || []).join('\n'));
            setShowDrySeqDialog(true);
          }}
          showMlxWarning={showMlxWarning}
        />

        <ModelSettingsAdvanced
          modelSettings={settings}
          defaultSettings={DEFAULT_SETTINGS}
          onSettingsChange={handleChange}
          showMlxWarning={showMlxWarning}
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
      </ScrollView>

      <ModelSettingsModals
        modelSettings={settings}
        defaultSettings={DEFAULT_SETTINGS}
        onSettingsChange={handleChange}
        showMlxWarning={showMlxWarning}
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

      {dialogConfig.setting && (
        <ModelSettingDialog
          key={dialogConfig.setting.key ?? dialogConfig.setting.label}
          visible={dialogConfig.visible}
          onClose={handleCloseDialog}
          onSave={async (value) => {
            if (!dialogConfig.setting) return;
            try {
              if (dialogConfig.setting.onSave) {
                await dialogConfig.setting.onSave(value);
              } else if (dialogConfig.setting.key) {
                await handleChange(
                  { [dialogConfig.setting.key]: value } as Partial<ModelSettings>,
                );
              }
              handleCloseDialog();
            } catch (_) {
              showAlert('Error', 'Failed to save setting');
            }
          }}
          defaultValue={
            dialogConfig.setting.defaultValue ??
            getDefault(dialogConfig.setting.key) ??
            dialogConfig.setting.value
          }
          label={dialogConfig.setting.label}
          value={dialogConfig.setting.value}
          minimumValue={dialogConfig.setting.minimumValue}
          maximumValue={dialogConfig.setting.maximumValue}
          step={dialogConfig.setting.step}
          description={dialogConfig.setting.description}
        />
      )}

      <StopWordsDialog
        visible={showStopWords}
        onClose={() => setShowStopWords(false)}
        onSave={(stopWords) => {
          handleChange({ stopWords });
          setShowStopWords(false);
        }}
        value={settings.stopWords}
        defaultValue={DEFAULT_SETTINGS.stopWords}
        description="Enter words that will cause the model to stop generating. Each word should be on a new line."
      />

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingBottom: 32,
    paddingTop: 12,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
});
