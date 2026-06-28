import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Animated, AppState, AppStateStatus, InteractionManager, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDownloadProgress, useDownloadDispatch } from '../context/DownloadContext';
import { useRemoteModel } from '../context/RemoteModelContext';
import { useStoredModels } from './useStoredModels';
import { modelDownloader } from '../services/ModelDownloader';
import { onlineModelService } from '../services/OnlineModelService';
import { modelSettingsService } from '../services/ModelSettingsService';
import { getUserFromSecureStorage } from '../services/AuthStorage';
import { logoutUser } from '../services/AuthService';
import { getActiveDownloadsCount } from '../utils/ModelUtils';
import { StoredModel } from '../services/ModelDownloaderTypes';
import { ShowDialogFn } from './useDialog';
import { SHARE_CANCELLED_ERROR } from '../services/StoredModelsManager';

const isAndroid = Platform.OS === 'android';

type ModelRouteParams = {
  autoEnableRemoteModels?: boolean;
  openRemoteTab?: boolean;
};

// Cleanup old incorrect task registration
const cleanupOldTask = async () => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync('background-download-task');
    if (isRegistered) {
      await BackgroundTask.unregisterTaskAsync('background-download-task');
    }
  } catch (e) {
    // ignore
  }
};
cleanupOldTask();

export const useModelScreenLogic = (routeParams?: ModelRouteParams) => {
  const { enableRemoteModels, isLoggedIn, checkLoginStatus, toggleRemoteModels } = useRemoteModel();
  const { storedModels, isLoading: isLoadingStoredModels, isRefreshing: isRefreshingStoredModels, refreshStoredModels, rescanStoredModels } = useStoredModels();
  const downloadProgress = useDownloadProgress();
  const setDownloadProgress = useDownloadDispatch();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'stored' | 'downloadable' | 'remote'>('stored');
  const [isDownloadsVisible, setIsDownloadsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [importingModelName, setImportingModelName] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showStorageWarningDialog, setShowStorageWarningDialog] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  const isShareCancelledError = (error: unknown): boolean => {
    const msg = (error as { message?: string } | undefined)?.message ?? String(error ?? '');
    return msg.toLowerCase().includes(SHARE_CANCELLED_ERROR);
  };

  const isDuplicateModelError = (error: unknown): boolean => {
    const msg = (error as { message?: string } | undefined)?.message ?? String(error ?? '');
    const lower = msg.toLowerCase();
    return lower.includes('already exists') || lower.includes('model with this name');
  };

  const normalizeModelName = (name: string): string => name.trim().toLowerCase();
  
  const buttonScale = useRef(new Animated.Value(1)).current;
  const prevActiveCount = useRef(0);
  const applyingRemoteIntent = useRef(false);

  useEffect(() => {
    checkLoginStatusAndUpdateUsername();
  }, []);

  const checkLoginStatusAndUpdateUsername = async () => {
    try {
      const userData = await getUserFromSecureStorage();
      if (userData) {
        setUsername(userData.email || userData.displayName);
        return;
      }
      
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        setUsername(user.email);
      }
    } catch (error) {
    }
  };

  const handleLogout = async (showDialog: ShowDialogFn, hideDialog: () => void) => {
    try {
      const result = await logoutUser();
      await AsyncStorage.removeItem('user');
      setUsername(null);
      await checkLoginStatus();
      
      if (activeTab === 'remote') {
        setActiveTab('stored');
      }
      
      if (result.success) {
        showDialog('Logged Out', 'You have been successfully logged out.');
      } else {
        showDialog('Logout Issue', result.error || 'There was an issue logging out. Please try again.');
      }
    } catch (error) {
      showDialog('Error', 'Failed to log out. Please try again.');
    }
  };

  const handleStorageWarningAccept = async (dontShowAgain: boolean, proceedWithImport: () => Promise<void>) => {
    if (dontShowAgain) {
      try {
        await AsyncStorage.setItem('hideStorageWarning', 'true');
      } catch (error) {
      }
    }
    setShowStorageWarningDialog(false);
    await new Promise(resolve => setTimeout(resolve, 500));
    await proceedWithImport();
  };

  const handleLinkModel = async (proceedWithImport: () => Promise<void>) => {
    try {
      const hideWarning = await AsyncStorage.getItem('hideStorageWarning');
      if (hideWarning !== 'true') {
        setShowStorageWarningDialog(true);
        return;
      }
      await proceedWithImport();
    } catch (error) {
      setShowStorageWarningDialog(true);
    }
  };

  const proceedWithModelImport = async (showDialog: ShowDialogFn) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets?.[0];
      if (!file?.uri || !file?.name) {
        showDialog('Error', 'No valid file was selected. Please try again.');
        return;
      }

      const fileName = file.name.toLowerCase();
      const isGguf = fileName.endsWith('.gguf');
      const isSafe = fileName.endsWith('.safetensors');

      if (!isGguf && !isSafe) {
        showDialog('Invalid File', 'Please select a GGUF or safetensors model file');
        return;
      }

      const existingModels = await modelDownloader.getStoredModels();
      const pickedName = normalizeModelName(file.name);
      const duplicate = existingModels.some(model => normalizeModelName(model.name) === pickedName);
      if (duplicate) {
        showDialog('Model Already Exists', `${file.name} is already imported.`);
        return;
      }

      setIsLoading(true);
      setImportingModelName(file.name);
      
      try {
        await new Promise<void>(resolve => InteractionManager.runAfterInteractions(() => resolve()));
        await modelDownloader.linkExternalModel(file.uri, file.name);
        setIsLoading(false);
        setImportingModelName(null);
        showDialog('Model Imported', 'The model has been successfully imported to the app.');
        await refreshStoredModels();
      } catch (error) {
        setIsLoading(false);
        setImportingModelName(null);
        if (isDuplicateModelError(error)) {
          showDialog('Model Already Exists', `${file.name} is already imported.`);
          return;
        }
        showDialog('Error', 'Failed to import the model. Please try again.');
      }
    } catch (error) {
      setIsLoading(false);
      const errorMessage = Platform.OS === 'ios'
        ? 'Could not open the file picker. Please try again.'
        : 'Could not open the file picker. Please ensure the app has storage permissions.';
      showDialog('Error', errorMessage);
    }
  };

  const handleCustomDownload = async (downloadId: number, modelName: string) => {
    router.push('/downloads');
    
    setDownloadProgress(prev => ({
      ...prev,
      [modelName.split('/').pop() || modelName]: {
        progress: 0,
        bytesDownloaded: 0,
        totalBytes: 0,
        status: 'starting',
        downloadId
      }
    }));
  };

  const cancelDownload = async (modelName: string, showDialog: ShowDialogFn) => {
    try {
      const downloadInfo = downloadProgress[modelName];
      if (!downloadInfo) {
        throw new Error('Download information not found');
      }
      
      await modelDownloader.cancelDownload(modelName);
      
      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[modelName];
        return newProgress;
      });

      await refreshStoredModels();
    } catch (error) {
      showDialog('Error', 'Failed to cancel download');
    }
  };

  const handleDelete = async (model: StoredModel, showDialog: ShowDialogFn, hideDialog: () => void) => {
    showDialog(
      'Delete Model',
      `Are you sure you want to delete ${model.name}?`
    );
  };

  const confirmDelete = async (model: StoredModel, showDialog: ShowDialogFn) => {
    try {
      const modelWithFiles = model as StoredModel & { mlxFiles?: StoredModel[] };
      
      if (modelWithFiles.mlxFiles && modelWithFiles.mlxFiles.length > 0) {
        for (const file of modelWithFiles.mlxFiles) {
          await modelDownloader.deleteModel(file.path);
          await modelSettingsService.deleteModelSettings(file.path);
        }
      } else {
        await modelDownloader.deleteModel(model.path);
        await modelSettingsService.deleteModelSettings(model.path);
      }
      
      await refreshStoredModels();
    } catch (error) {
      showDialog('Error', 'Failed to delete model');
    }
  };

  const handleExport = async (modelPath: string, modelName: string, showDialog: ShowDialogFn) => {
    try {
      setIsLoading(true);
      setIsExporting(true);
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      await new Promise<void>(resolve => InteractionManager.runAfterInteractions(() => resolve()));
      await modelDownloader.exportModel(modelPath, modelName);
    } catch (error) {
      if (isShareCancelledError(error)) {
        return;
      }
      showDialog('Share Failed', `Failed to share ${modelName}. Please try again.`);
    } finally {
      setIsLoading(false);
      setIsExporting(false);
    }
  };

  const handleModelSettings = (modelPath: string, modelName: string) => {
    router.push({ pathname: '/model-settings', params: { modelName, modelPath } });
  };

  const handleTabPress = (tab: 'stored' | 'downloadable' | 'remote', showDialog: ShowDialogFn, hideDialog: () => void) => {
    if (tab === 'remote') {
      if (!isLoggedIn || !enableRemoteModels) {
        showDialog(
          'Remote Models Disabled',
          'Remote models require the "Enable Remote Models" setting to be turned on and you need to be signed in. Would you like to go to Settings to configure this?'
        );
        return;
      }
    }
    setActiveTab(tab);
  };

  useEffect(() => {
    if (!enableRemoteModels && activeTab === 'remote') {
      setActiveTab('stored');
    }
  }, [enableRemoteModels, activeTab]);

  useEffect(() => {
    if (applyingRemoteIntent.current) {
      return;
    }

    const shouldAutoEnableRemote = routeParams?.autoEnableRemoteModels === true;
    const shouldOpenRemoteTab = routeParams?.openRemoteTab === true;

    if (!shouldAutoEnableRemote && !shouldOpenRemoteTab) {
      return;
    }

    if (!isLoggedIn) {
      return;
    }

    applyingRemoteIntent.current = true;

    const applyIntent = async () => {
      try {
        let canOpenRemoteTab = enableRemoteModels;

        if (shouldAutoEnableRemote && !enableRemoteModels) {
          const result = await toggleRemoteModels();
          canOpenRemoteTab = result.success || enableRemoteModels;
        }

        if (shouldOpenRemoteTab && canOpenRemoteTab) {
          setActiveTab('remote');
        }
      } finally {
        router.setParams({
          autoEnableRemoteModels: undefined,
          openRemoteTab: undefined,
        });
        applyingRemoteIntent.current = false;
      }
    };

    applyIntent();
  }, [routeParams, isLoggedIn, enableRemoteModels, toggleRemoteModels]);

  const hasActiveDownloads = getActiveDownloadsCount(downloadProgress) > 0;
  const hasActiveRef = useRef(hasActiveDownloads);
  hasActiveRef.current = hasActiveDownloads;

  useEffect(() => {
    const run = () => modelDownloader.ensureDownloadsAreRunning().catch(() => {});
    InteractionManager.runAfterInteractions(run);

    if (Platform.OS !== 'ios') return;

    const id = setInterval(() => {
      if (hasActiveRef.current) {
        InteractionManager.runAfterInteractions(run);
      }
    }, 1000);

    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const activeCount = getActiveDownloadsCount(downloadProgress);
    if (activeCount !== prevActiveCount.current && activeCount > 0) {
      Animated.sequence([
        Animated.timing(buttonScale, { toValue: 1.2, duration: 200, useNativeDriver: true }),
        Animated.timing(buttonScale, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
    prevActiveCount.current = activeCount;
  }, [downloadProgress]);

  useEffect(() => {
    const handleImportProgress = (progress: { modelName: string; status: 'importing' | 'completed' | 'error'; error?: string }) => {
      if (isExporting) return;
      if (progress.status === 'importing') {
        setImportingModelName(progress.modelName);
      } else {
        setImportingModelName(null);
      }
    };

    modelDownloader.on('importProgress', handleImportProgress);
    return () => {
      modelDownloader.off('importProgress', handleImportProgress);
    };
  }, [isExporting]);


  return {
    activeTab,
    setActiveTab,
    storedModels,
    isLoadingStoredModels,
    isRefreshingStoredModels,
    refreshStoredModels,
    rescanStoredModels,
    downloadProgress,
    setDownloadProgress,
    isDownloadsVisible,
    setIsDownloadsVisible,
    buttonScale,
    isLoading,
    importingModelName,
    isExporting,
    showStorageWarningDialog,
    setShowStorageWarningDialog,
    username,
    enableRemoteModels,
    isLoggedIn,
    handleLogout,
    handleStorageWarningAccept,
    handleLinkModel,
    proceedWithModelImport,
    handleCustomDownload,
    cancelDownload,
    handleDelete,
    confirmDelete,
    handleExport,
    handleModelSettings,
    handleTabPress,
  };
};
