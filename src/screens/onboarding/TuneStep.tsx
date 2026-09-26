import React, { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

import type { DownloadableModel } from '../../components/model/DownloadableModelItem';
import ModelSettingDialog from '../../components/ModelSettingDialog';
import SystemPromptDialog from '../../components/SystemPromptDialog';
import ModelSettingsSampling from '../../components/settings/ModelSettingsSampling';
import SettingsSection from '../../components/settings/SettingsSection';
import { DEFAULT_SETTINGS, LLAMA_INIT_CONFIG } from '../../config/llamaConfig';
import { theme } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import type { GpuConfig } from '../../components/settings/ModelSettingsCore';
import type { ModelSettings } from '../../services/ModelSettingsService';
import {
  DEFAULT_GPU_LAYERS,
  GPU_LAYER_MAX,
  GPU_LAYER_MIN,
  gpuSettingsService,
  type GpuSettings,
} from '../../services/GpuSettingsService';
import { checkGpuSupport, type GpuSupport } from '../../utils/gpuCapabilities';
import { getThemeAwareColor } from '../../utils/ColorUtils';
import { llamaManager } from '../../utils/LlamaManager';
import { ModelFormat } from '../../types/models';

const INIT_STORAGE_KEY = 'model_selector_init_v1';

type InitOverrides = {
  n_ctx: number;
  n_batch: number;
  n_parallel: number;
  n_threads: number;
  n_gpu_layers: number;
};

const defaultInit: InitOverrides = {
  n_ctx: LLAMA_INIT_CONFIG.n_ctx,
  n_batch: LLAMA_INIT_CONFIG.n_batch,
  n_parallel: LLAMA_INIT_CONFIG.n_parallel,
  n_threads: LLAMA_INIT_CONFIG.n_threads,
  n_gpu_layers: LLAMA_INIT_CONFIG.n_gpu_layers,
};

export type TuneStepProps = {
  selectedModels: DownloadableModel[];
  onContinue: () => void;
  onSkip: () => void;
};

type DialogSettingConfig = {
  key?: keyof ModelSettings;
  label: string;
  value: number;
  defaultValue?: number;
  minimumValue: number;
  maximumValue: number;
  step: number;
  description: string;
  onSave?: (value: number) => void | Promise<void>;
};

const toNum = (value: unknown, fallback: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }
  return Math.round(value);
};

const parseInit = (raw: string): InitOverrides => {
  try {
    const parsed = JSON.parse(raw) as Partial<InitOverrides>;
    return {
      n_ctx: toNum(parsed.n_ctx, defaultInit.n_ctx),
      n_batch: toNum(parsed.n_batch, defaultInit.n_batch),
      n_parallel: toNum(parsed.n_parallel, defaultInit.n_parallel),
      n_threads: toNum(parsed.n_threads, defaultInit.n_threads),
      n_gpu_layers: toNum(parsed.n_gpu_layers, defaultInit.n_gpu_layers),
    };
  } catch {
    return defaultInit;
  }
};

export function modelUsesLlamaCpp(model: DownloadableModel): boolean {
  if (model.modelFormat === ModelFormat.LITERT) {
    return false;
  }
  if (model.tags?.includes('litert')) {
    return false;
  }
  if (model.tags?.includes('llama.cpp')) {
    return true;
  }
  if (model.modelFormat === ModelFormat.GGUF) {
    return true;
  }
  const link = model.huggingFaceLink?.toLowerCase() ?? '';
  if (link.endsWith('.litertlm') || link.endsWith('.task')) {
    return false;
  }
  return link.endsWith('.gguf') || !model.modelFormat;
}

export default function TuneStep({ selectedModels, onContinue, onSkip }: TuneStepProps) {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const iconColor = currentTheme === 'dark' ? '#FFFFFF' : themeColors.primary;

  const showLlamaHardware = useMemo(
    () => selectedModels.some(modelUsesLlamaCpp),
    [selectedModels],
  );

  const [settings, setSettings] = useState<ModelSettings>(() => llamaManager.getSettings());
  const [error, setError] = useState<string | null>(null);
  const [noExtraBuffers, setNoExtraBuffers] = useState(() => llamaManager.getNoExtraBuffers());
  const [initOverrides, setInitOverrides] = useState<InitOverrides>(defaultInit);
  const [gpuSettings, setGpuSettings] = useState<GpuSettings>(gpuSettingsService.getSettingsSync());
  const [gpuSupport, setGpuSupport] = useState<GpuSupport | null>(null);
  const [showSystemPromptDialog, setShowSystemPromptDialog] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    setting?: DialogSettingConfig;
  }>({ visible: false });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setSettings(llamaManager.getSettings());
      setNoExtraBuffers(llamaManager.getNoExtraBuffers());

      try {
        const raw = await AsyncStorage.getItem(INIT_STORAGE_KEY);
        if (raw && active) {
          setInitOverrides(parseInit(raw));
        }
      } catch {
        // keep defaults
      }

      if (!showLlamaHardware) {
        return;
      }

      try {
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
        }
      } catch {
        // keep sync defaults
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [showLlamaHardware]);

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
      showTopP: true,
      showTopK: true,
      showMinP: true,
      showXtc: false,
      showTypicalP: false,
      showCountThinkingTokens: true,
      showNoExtraBuffers: showLlamaHardware,
      showGpu: showLlamaHardware,
    }),
    [showLlamaHardware],
  );

  const getDefaultValue = (key?: keyof ModelSettings): number | undefined => {
    if (!key) {
      return undefined;
    }
    const value = DEFAULT_SETTINGS[key];
    return typeof value === 'number' ? value : undefined;
  };

  const handleSettingsChange = (partial: Partial<ModelSettings>) => {
    const updated = { ...settings, ...partial };
    if ('maxTokens' in partial) {
      if (updated.maxTokens < 1 || updated.maxTokens > 4096) {
        setError('Max tokens must be between 1 and 4096');
        return;
      }
    }
    setError(null);
    setSettings(updated);
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
        defaultValue:
          typeof inferredDefault === 'number' ? inferredDefault : config.value,
      },
    });
  };

  const handleCloseDialog = () => {
    setDialogConfig({ visible: false });
  };

  const handleGpuToggle = (enabled: boolean) => {
    setGpuSettings(prev => ({ ...prev, enabled }));
  };

  const handleNoExtraBuffersToggle = (enabled: boolean) => {
    setNoExtraBuffers(enabled);
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

  const persistInitOverrides = async (next: InitOverrides) => {
    let merged = next;
    try {
      const raw = await AsyncStorage.getItem(INIT_STORAGE_KEY);
      if (raw) {
        merged = { ...parseInit(raw), ...next };
      }
      await AsyncStorage.setItem(INIT_STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // best effort
    }
  };

  const handleContinue = async () => {
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      await llamaManager.updateSettings(settings);
      await llamaManager.saveSettings();

      if (showLlamaHardware) {
        await llamaManager.setNoExtraBuffers(noExtraBuffers);
        await gpuSettingsService.setEnabled(gpuSettings.enabled);
        await gpuSettingsService.setLayers(gpuSettings.layers);
        const nextInit: InitOverrides = {
          ...initOverrides,
          n_ctx: initOverrides.n_ctx,
          n_gpu_layers: gpuSettings.layers,
        };
        setInitOverrides(nextInit);
        await persistInitOverrides(nextInit);
        llamaManager.setInitOverrides({
          n_ctx: nextInit.n_ctx,
          n_gpu_layers: nextInit.n_gpu_layers,
        });
      }

      onContinue();
    } catch {
      setError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const accent = getThemeAwareColor('#4a0660', currentTheme);
  const initBadgeBg = currentTheme === 'dark' ? 'rgba(255,255,255,0.12)' : themeColors.primary + '18';
  const initBadgeColor = currentTheme === 'dark' ? '#fff' : themeColors.primary;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: themeColors.text }]}>Tune inference</Text>
        <Text style={[styles.subtitle, { color: themeColors.secondaryText }]}>
          Optional defaults for sampling and llama.cpp hardware. You can change these later in Settings.
        </Text>

        <SettingsSection title="Assistant">
          <TouchableOpacity
            style={[styles.settingItem, styles.settingItemBorder]}
            onPress={() => setShowSystemPromptDialog(true)}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : themeColors.primary + '20' }]}>
                <MaterialCommunityIcons name="message-text-outline" size={22} color={iconColor} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingText, { color: themeColors.text }]}>System Prompt</Text>
                <Text style={[styles.settingDescription, { color: themeColors.secondaryText }]}>
                  Set how the assistant should behave in chat
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={themeColors.secondaryText} />
          </TouchableOpacity>
        </SettingsSection>

        <SettingsSection title="Sampling">
          <ModelSettingsSampling
            modelSettings={settings}
            defaultSettings={DEFAULT_SETTINGS}
            error={error}
            onSettingsChange={handleSettingsChange}
            onMaxTokensPress={() => handleOpenDialog(maxTokensDialog)}
            onDialogOpen={handleOpenDialog}
            noExtraBuffers={showLlamaHardware ? noExtraBuffers : undefined}
            onToggleNoExtraBuffers={showLlamaHardware ? handleNoExtraBuffersToggle : undefined}
            gpuConfig={showLlamaHardware ? gpuConfig : undefined}
            onToggleGpu={showLlamaHardware ? handleGpuToggle : undefined}
            visibility={samplingVisibility}
          />
        </SettingsSection>

        {showLlamaHardware ? (
          <SettingsSection title="llama.cpp">
            <View style={[styles.initWarningRow, { backgroundColor: currentTheme === 'dark' ? 'rgba(255,176,0,0.1)' : 'rgba(255,152,0,0.08)', borderColor: currentTheme === 'dark' ? 'rgba(255,176,0,0.25)' : 'rgba(255,152,0,0.3)' }]}>
              <MaterialCommunityIcons name="information-outline" size={14} color={currentTheme === 'dark' ? '#FFB300' : '#E65100'} />
              <Text style={[styles.initWarningText, { color: currentTheme === 'dark' ? '#FFB300' : '#E65100' }]}>
                Context and GPU layers apply on the next llama.cpp model load.
              </Text>
            </View>

            <View style={styles.initSliderItem}>
              <View style={styles.initSliderHeader}>
                <View style={styles.initSliderLabelGroup}>
                  <Text style={{ fontWeight: '600', color: themeColors.text }}>Context window</Text>
                  <Text style={[styles.initSliderDesc, { color: themeColors.secondaryText }]}>
                    Max tokens the model remembers (n_ctx)
                  </Text>
                </View>
                <View style={[styles.initValueBadge, { backgroundColor: initBadgeBg }]}>
                  <Text style={[styles.initValueBadgeText, { color: initBadgeColor }]}>{initOverrides.n_ctx}</Text>
                </View>
              </View>
              <Slider
                minimumValue={512}
                maximumValue={16384}
                step={256}
                value={initOverrides.n_ctx}
                onValueChange={(value) => setInitOverrides(prev => ({ ...prev, n_ctx: Math.round(value) }))}
                minimumTrackTintColor={accent}
                thumbTintColor={accent}
              />
            </View>

            <TouchableOpacity
              style={[styles.settingItem, styles.settingItemBorder]}
              onPress={() =>
                handleOpenDialog({
                  label: 'GPU layers',
                  value: gpuSettings.layers,
                  defaultValue: DEFAULT_GPU_LAYERS,
                  minimumValue: GPU_LAYER_MIN,
                  maximumValue: GPU_LAYER_MAX,
                  step: 1,
                  description: 'Number of transformer layers to offload to the GPU when acceleration is enabled.',
                  onSave: (value) => {
                    setGpuSettings(prev => ({ ...prev, layers: value }));
                    setInitOverrides(prev => ({ ...prev, n_gpu_layers: value }));
                  },
                })
              }
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : themeColors.primary + '20' }]}>
                  <MaterialCommunityIcons name="layers-triple" size={22} color={iconColor} />
                </View>
                <View style={styles.settingTextContainer}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.settingText, { color: themeColors.text }]}>GPU layers</Text>
                    <Text style={[styles.valueText, { color: themeColors.text }]}>{gpuSettings.layers}</Text>
                  </View>
                  <Text style={[styles.settingDescription, { color: themeColors.secondaryText }]}>
                    Layer offload count for llama.cpp (n_gpu_layers)
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={themeColors.secondaryText} />
            </TouchableOpacity>
          </SettingsSection>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: 'rgba(150,150,150,0.15)' }]}>
        <TouchableOpacity style={styles.skipButton} onPress={onSkip} disabled={isSaving}>
          <Text style={[styles.skipText, { color: themeColors.secondaryText }]}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: themeColors.primary, opacity: isSaving ? 0.7 : 1 }]}
          onPress={handleContinue}
          disabled={isSaving}
        >
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>
      </View>

      <SystemPromptDialog
        visible={showSystemPromptDialog}
        onClose={() => setShowSystemPromptDialog(false)}
        onSave={(systemPrompt) => {
          handleSettingsChange({ systemPrompt });
          setShowSystemPromptDialog(false);
        }}
        value={settings.systemPrompt}
        defaultValue={DEFAULT_SETTINGS.systemPrompt}
        description="Define how the AI assistant should behave. This prompt sets the personality, capabilities, and limitations of the assistant."
      />

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
                handleSettingsChange({ [dialogConfig.setting.key]: value } as Partial<ModelSettings>);
              }
              handleCloseDialog();
            } catch {
              setError('Failed to save setting');
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingItemBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  valueText: {
    fontSize: 16,
    fontWeight: '500',
  },
  initWarningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  initWarningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  initSliderItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  initSliderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  initSliderLabelGroup: {
    flex: 1,
    paddingRight: 12,
  },
  initSliderDesc: {
    fontSize: 12,
    marginTop: 4,
  },
  initValueBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  initValueBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
