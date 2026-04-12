import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Platform, ScrollView, Linking, TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, TabParamList } from '../types/navigation';
import { useTheme } from '../context/ThemeContext';
import { useRemoteModel } from '../context/RemoteModelContext';
import { theme } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { engineService } from '../services/inference-engine-service';
import AppHeader from '../components/AppHeader';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { llamaManager } from '../utils/LlamaManager';
import SystemPromptDialog from '../components/SystemPromptDialog';
import { fs as FileSystem } from '../services/fs';
import { useFocusEffect } from '@react-navigation/native';
import { modelDownloader } from '../services/ModelDownloader';
import AppearanceSection from '../components/settings/AppearanceSection';
import { getCurrentUser } from '../services/AuthService';
import SupportSection from '../components/settings/SupportSection';
import ModelSettingsSection from '../components/settings/ModelSettingsSection';
import SystemInfoSection from '../components/settings/SystemInfoSection';
import StorageSection from '../components/settings/StorageSection';
import Dialog from '../components/Dialog';
import * as WebBrowser from 'expo-web-browser';
import { DEFAULT_SETTINGS } from '../config/llamaConfig';
import type { ModelSettings as StoredModelSettings } from '../services/ModelSettingsService';
import { modelSettingsService } from '../services/ModelSettingsService';
import { appleFoundationService } from '../services/AppleFoundationService';

type SettingsScreenProps = {
  navigation: CompositeNavigationProp<
    BottomTabNavigationProp<TabParamList, 'SettingsTab'>,
    NativeStackNavigationProp<RootStackParamList>
  >;
};

type ThemeOption = 'system' | 'light' | 'dark';
type InferenceEngine = 'llama' | 'mlx';

type ModelSettingKey = keyof StoredModelSettings;

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

const IN_APP_BROWSER_URLS = new Set([
  'https://inferrlm.app/privacy-policy',
  'https://github.com/sbhjt-gr/InferrLM',
  'https://github.com/sbhjt-gr/InferrLM/issues',
]);

const normalizeLink = (url: string) => url.replace(/\/+$/, '');

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { theme: currentTheme, selectedTheme, toggleTheme } = useTheme();
  const { enableRemoteModels, toggleRemoteModels, isLoggedIn } = useRemoteModel();
  const [systemInfo, setSystemInfo] = useState({
    os: Platform.OS,
    osVersion: Device.osVersion,
    device: Device.modelName || 'Unknown',
    deviceType: Device.deviceType || 'Unknown',
    appVersion: Constants.expoConfig?.version || 'Unknown',
    cpu: 'Unknown',
    memory: 'Unknown',
    gpu: 'Unknown'
  });
  const [modelSettings, setModelSettings] = useState<StoredModelSettings>(
    llamaManager.getSettings()
  );
  const [error, setError] = useState<string | null>(null);
  const [activeInferenceEngine, setActiveInferenceEngine] =
    useState<InferenceEngine>('llama');
  const [engineEnabled, setEngineEnabled] = useState<Record<InferenceEngine, boolean>>({
    llama: true,
    mlx: true,
  });
  
  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    setting?: DialogSettingConfig;
  }>({
    visible: false,
  });
  const [showSystemPromptDialog, setShowSystemPromptDialog] = useState(false);
  const [storageInfo, setStorageInfo] = useState({
    cacheSize: '0 B'
  });
  const [clearingType, setClearingType] = useState<'cache' | 'models' | null>(null);
  const isAppleDevice = Platform.OS === 'ios';
  const [appleFoundationEnabled, setAppleFoundationEnabled] = useState(false);
  const [appleFoundationSupported, setAppleFoundationSupported] = useState(false);
  const [showAppleFoundationDialog, setShowAppleFoundationDialog] = useState(false);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');
  const [dialogPrimaryText, setDialogPrimaryText] = useState<string | undefined>(undefined);
  const [dialogPrimaryPress, setDialogPrimaryPress] = useState<(() => void) | undefined>(undefined);
  const [dialogSecondaryText, setDialogSecondaryText] = useState<string | undefined>(undefined);
  const [dialogSecondaryPress, setDialogSecondaryPress] = useState<(() => void) | undefined>(undefined);

  const hideDialog = () => {
    setDialogVisible(false);
  };

  interface BtnCfg { label: string; onPress: () => void }

  const showDialog = (
    title: string,
    message: string,
    primary?: BtnCfg,
    secondary?: BtnCfg,
  ) => {
    setDialogTitle(title);
    setDialogMessage(message);
    const autoClose = () => setDialogVisible(false);
    setDialogPrimaryText(primary?.label ?? 'OK');
    setDialogPrimaryPress(() => primary ? primary.onPress : autoClose);
    setDialogSecondaryText(secondary?.label);
    setDialogSecondaryPress(secondary ? () => secondary.onPress : undefined);
    setDialogVisible(true);
  };

  const getDefaultValueForKey = (key?: ModelSettingKey): number | undefined => {
    if (!key) {
      return undefined;
    }

    const defaultsRecord = DEFAULT_SETTINGS as unknown as Record<string, unknown>;
    const candidate = defaultsRecord[key as string];
    return typeof candidate === 'number' ? (candidate as number) : undefined;
  };

  useEffect(() => {
    let isActive = true;

    const initializeAppleFoundation = async () => {
      if (!isAppleDevice) {
        if (isActive) {
          setAppleFoundationEnabled(false);
          setAppleFoundationSupported(false);
        }
        return;
      }
      try {
        const available = appleFoundationService.isAvailable();
        const enabled = await appleFoundationService.isEnabled();
        if (isActive) {
          setAppleFoundationSupported(available);
          setAppleFoundationEnabled(enabled);
        }
      } catch (error) {
        if (isActive) {
          setAppleFoundationSupported(false);
          setAppleFoundationEnabled(false);
        }
      }
    };

    initializeAppleFoundation();

    return () => {
      isActive = false;
    };
  }, [isAppleDevice]);

  useFocusEffect(
    React.useCallback(() => {
      setModelSettings(llamaManager.getSettings());
      loadStorageInfo();
      loadInferenceEnginePreference();
    }, [])
  );

  useEffect(() => {
    const getSystemInfo = async () => {
      try {
        const memory = Device.totalMemory;
        const memoryGB = memory ? (memory / (1024 * 1024 * 1024)).toFixed(1) : 'Unknown';
        
        const cpuCores = Device.supportedCpuArchitectures?.join(', ') || 'Unknown';
        
        setSystemInfo(prev => ({
          os: Platform.OS,
          osVersion: Device.osVersion || Platform.Version.toString(),
          device: Device.modelName || 'Unknown',
          deviceType: Device.deviceType || 'Unknown',
          appVersion: Constants.expoConfig?.version || 'Unknown',
          cpu: cpuCores,
          memory: `${memoryGB} GB`,
          gpu: Device.modelName || 'Unknown'
        }));
      } catch (error) {
      }
    };

    getSystemInfo();
  }, []);

  const loadInferenceEnginePreference = async () => {
    try {
      const { active, enabled } = await engineService.load();
      const supportsMLX = Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 16;
      const nextEnabled = {
        llama: enabled.llama,
        mlx: supportsMLX ? enabled.mlx : false,
      };
      setEngineEnabled(nextEnabled);

      if (!supportsMLX && enabled.mlx) {
        await engineService.setEnabled('mlx', false);
      }

      const fallback = nextEnabled.llama ? 'llama' : 'mlx';
      const nextActive = nextEnabled[active] ? active : fallback;
      if (nextActive !== active) {
        await engineService.set(nextActive);
      }
      setActiveInferenceEngine(nextActive);
    } catch (error) {
    }
  };

  const handleThemeChange = async (newTheme: ThemeOption) => {
    try {
      await AsyncStorage.setItem('@theme_preference', newTheme);
      toggleTheme(newTheme);
    } catch (error) {
    }
  };

  const handleInferenceEngineToggle = async (engine: InferenceEngine, enabled: boolean) => {
    const next = { ...engineEnabled, [engine]: enabled };
    if (!next.llama && !next.mlx) {
      showDialog('Engine Required', 'At least one inference engine must remain enabled.');
      return;
    }

    const previous = engineEnabled[engine];
    setEngineEnabled(next);

    try {
      await engineService.setEnabled(engine, enabled);
      if (!enabled && activeInferenceEngine === engine) {
        const fallback = next.llama ? 'llama' : 'mlx';
        await engineService.set(fallback);
        setActiveInferenceEngine(fallback);
      }
    } catch (error) {
      setEngineEnabled(prev => ({ ...prev, [engine]: previous }));
      showDialog('Error', 'Failed to update inference engine preference');
    }
  };

  const handleSettingsChange = async (newSettings: Partial<typeof modelSettings>) => {
    try {
      const updatedSettings = { ...modelSettings, ...newSettings };
      if ('maxTokens' in newSettings) {
        const tokens = updatedSettings.maxTokens;
        if (tokens < 1 || tokens > 4096) {
          setError('Max tokens must be between 1 and 4096');
          return;
        }
      }
      setError(null);
      setModelSettings(updatedSettings);
      await llamaManager.updateSettings(updatedSettings);
    } catch (error) {
      showDialog('Error', 'Failed to save settings');
    }
  };

  const openLink = async (url: string) => {
    try {
      const normalizedUrl = normalizeLink(url);
      if (IN_APP_BROWSER_URLS.has(normalizedUrl)) {
        await WebBrowser.openBrowserAsync(normalizedUrl);
        return;
      }
      await Linking.openURL(normalizedUrl);
    } catch (error) {
      showDialog('Error', 'Failed to open link');
    }
  };

  const handleOpenDialog = (config: DialogSettingConfig) => {
    const inferredDefault =
      config.defaultValue !== undefined
        ? config.defaultValue
        : getDefaultValueForKey(config.key);

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

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDirectorySize = async (directory: string, depth = 0): Promise<number> => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(directory);
      if (!dirInfo.exists) {
        return 0;
      }

      const files = await FileSystem.readDirectoryAsync(directory);
      let totalSize = 0;

      for (const file of files) {
        const filePath = `${directory}/${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath, { size: true });
        if (!fileInfo.exists) {
          continue;
        }

        if ((fileInfo as any).isDirectory) {
          totalSize += await getDirectorySize(filePath, depth + 1);
        } else {
          totalSize += (fileInfo as any).size || 0;
        }
      }

      return totalSize;
    } catch (error) {
      return 0;
    }
  };

  const loadStorageInfo = async () => {
    try {
      const cacheDir = FileSystem.cacheDirectory || '';
      const tempDir = `${FileSystem.documentDirectory}temp`;
      const [cacheSize, tempSize] = await Promise.all([
        getDirectorySize(cacheDir),
        getDirectorySize(tempDir),
      ]);
      setStorageInfo({
        cacheSize: formatBytes(cacheSize + tempSize)
      });
    } catch (error) {
    }
  };

  const clearDirectory = async (directory: string): Promise<void> => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(directory);
      if (!dirInfo.exists) return;

      const files = await FileSystem.readDirectoryAsync(directory);
      
      for (const file of files) {
        const filePath = `${directory}/${file}`;
        await FileSystem.deleteAsync(filePath, { idempotent: true });
      }
    } catch (error) {
      throw error;
    }
  };

  const clearCache = async () => {
    try {
      setClearingType('cache');
      const tempDir = `${FileSystem.documentDirectory}temp`;
      if (FileSystem.cacheDirectory) {
        await clearDirectory(FileSystem.cacheDirectory);
      }
      await clearDirectory(tempDir);
      await loadStorageInfo();
      showDialog('Success', 'Cache cleared successfully');
    } catch (error) {
      showDialog('Error', 'Failed to clear cache');
    } finally {
      setClearingType(null);
    }
  };


  const clearAllModels = async () => {
    const modelsDir = `${FileSystem.documentDirectory}models`;
    const hfDir = `${FileSystem.documentDirectory}huggingface`;

    setClearingType('models');

    try {
      const [modelsSize, hfSize] = await Promise.all([
        getDirectorySize(modelsDir),
        getDirectorySize(hfDir),
      ]);
      const totalSize = modelsSize + hfSize;
      const totalSizeText = formatBytes(totalSize);

      setClearingType(null);
      showDialog(
        'Clear All Models',
        `Are you sure you want to delete all models? This action cannot be undone.\n\nStorage to be freed: ${totalSizeText}`,
        {
          label: 'Delete',
          onPress: async () => {
            hideDialog();
            try {
              setClearingType('models');
              await modelDownloader.clearAllModels();
              await modelSettingsService.clearAllSettings();
              await loadStorageInfo();
              showDialog('Success', 'All models cleared successfully');
            } catch (error) {
              showDialog('Error', 'Failed to clear models');
            } finally {
              setClearingType(null);
            }
          }
        },
        {
          label: 'Cancel',
          onPress: () => {
            hideDialog();
          }
        }
      );
    } catch (error) {
      setClearingType(null);
      showDialog('Error', 'Failed to clear models');
    }
  };

  const handleRemoteModelsToggle = async () => {
    if (!isLoggedIn && !enableRemoteModels) {
      showDialog(
        'Authentication Required',
        'InferrLM will require internet access and you need an account to enable remote models.',
        {
          label: 'Sign In',
          onPress: () => {
            hideDialog();
            navigation.navigate('Login', {
              redirectTo: 'MainTabs',
              redirectParams: {
                screen: 'ModelTab',
                params: {
                  autoEnableRemoteModels: true,
                  openRemoteTab: true,
                },
              }
            });
          }
        },
        {
          label: 'Sign Up',
          onPress: () => {
            hideDialog();
            navigation.navigate('Register', {
              redirectTo: 'MainTabs',
              redirectParams: {
                screen: 'ModelTab',
                params: {
                  autoEnableRemoteModels: true,
                  openRemoteTab: true,
                },
              }
            });
          }
        }
      );
      return;
    }
    
    if (!enableRemoteModels) {
      const user = await getCurrentUser();
      if (user && !user.emailVerified) {
        showDialog(
          'Email Verification Required',
          'You need to verify your email address before enabling remote models.',
          {
            label: 'Go to Profile',
            onPress: () => {
              hideDialog();
              navigation.navigate('Profile');
            }
          },
          { label: 'Cancel', onPress: hideDialog }
        );
        return;
      }
    }
    
    const result = await toggleRemoteModels();
    if (!result.success) {
      if (result.requiresLogin) {
        navigation.navigate('Login', {
          redirectTo: 'MainTabs',
          redirectParams: {
            screen: 'ModelTab',
            params: {
              autoEnableRemoteModels: true,
              openRemoteTab: true,
            },
          }
        });
      } else if (result.emailNotVerified) {
        showDialog(
          'Email Verification Required',
          'You need to verify your email address before enabling remote models.',
          {
            label: 'Go to Profile',
            onPress: () => {
              hideDialog();
              navigation.navigate('Profile');
            }
          },
          { label: 'Cancel', onPress: hideDialog }
        );
      }
    }
  };

  const handleAppleFoundationToggle = async (value: boolean) => {
    if (!isAppleDevice) {
      return;
    }
    if (value) {
      const available = appleFoundationService.isAvailable();
      setAppleFoundationSupported(available);
      if (!available) {
        setShowAppleFoundationDialog(true);
        setAppleFoundationEnabled(false);
        await appleFoundationService.setEnabled(false);
        return;
      }
    }
    try {
      await appleFoundationService.setEnabled(value);
      setAppleFoundationEnabled(value);
    } catch (error) {
      const current = await appleFoundationService.isEnabled();
      setAppleFoundationEnabled(current);
    }
  };

  const ProfileButton = () => {
    return (
      <TouchableOpacity
        style={styles.headerButton}
        onPress={() => {
          if (isLoggedIn) {
            navigation.navigate('Profile');
          } else {
            navigation.navigate('Login', {
              redirectTo: 'MainTabs',
              redirectParams: { screen: 'SettingsTab' }
            });
          }
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialCommunityIcons 
          name={isLoggedIn ? "account-circle" : "login"}
          size={22} 
          color={theme[currentTheme].headerText} 
        />
      </TouchableOpacity>
    );
  };

  return (
      <View style={[styles.container, { backgroundColor: theme[currentTheme].background }]}>
      <AppHeader 
        title="Settings"
        rightButtons={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <ProfileButton />
          </View>
        } 
      />
      <ScrollView contentContainerStyle={styles.contentContainer}>
        
       <AppearanceSection
        selectedTheme={selectedTheme}
        onThemeChange={handleThemeChange}
        />
        
        <ModelSettingsSection
          modelSettings={modelSettings}
          defaultSettings={DEFAULT_SETTINGS}
          error={error}
          onSettingsChange={handleSettingsChange}
          onDialogOpen={handleOpenDialog}
          activeEngine={activeInferenceEngine}
          engineEnabled={engineEnabled}
          onEngineToggle={handleInferenceEngineToggle}
          onOpenSystemPromptDialog={() => setShowSystemPromptDialog(true)}
          enableRemoteModels={enableRemoteModels}
          onToggleRemoteModels={handleRemoteModelsToggle}
          showAppleFoundationToggle={isAppleDevice}
          appleFoundationEnabled={appleFoundationEnabled}
          onToggleAppleFoundation={handleAppleFoundationToggle}
          onModelParametersPress={() => navigation.navigate('ModelParameters')}
        />

        <StorageSection
          storageInfo={storageInfo}
          clearingType={clearingType}
          onClearCache={clearCache}
          onClearAllModels={clearAllModels}
        />

        <SupportSection 
          onOpenLink={openLink} 
          onNavigateToLicenses={() => navigation.navigate('Licenses')}
          onNavigateToContentTerms={() => navigation.navigate('ContentTerms')}
        />  

        <SystemInfoSection systemInfo={systemInfo} />
        
        <SystemPromptDialog
          visible={showSystemPromptDialog}
          onClose={() => setShowSystemPromptDialog(false)}
          onSave={(systemPrompt) => {
            handleSettingsChange({ systemPrompt });
            setShowSystemPromptDialog(false);
          }}
          value={modelSettings.systemPrompt}
          defaultValue={DEFAULT_SETTINGS.systemPrompt}
          description="Define how the AI assistant should behave. This prompt sets the personality, capabilities, and limitations of the assistant."
        />

      </ScrollView>

      <Dialog
        visible={showAppleFoundationDialog}
        onDismiss={() => setShowAppleFoundationDialog(false)}
        title="Apple Intelligence"
        description="Apple Intelligence not enabled on this device."
        buttonText="OK"
        onClose={() => setShowAppleFoundationDialog(false)}
      />

      <Dialog
        visible={dialogVisible}
        onDismiss={hideDialog}
        title={dialogTitle || undefined}
        description={dialogMessage || undefined}
        primaryButtonText={dialogPrimaryText}
        onPrimaryPress={dialogPrimaryPress}
        secondaryButtonText={dialogSecondaryText}
        onSecondaryPress={dialogSecondaryPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
    paddingTop: 22
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  debugButtonContent: {
    marginLeft: 12,
    flex: 1,
  },
  debugButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  debugButtonSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
}); 
