import { useState, useEffect, useCallback, useRef } from 'react';
import { modelDownloader } from '../services/ModelDownloader';
import { StoredModel } from '../services/ModelDownloaderTypes';

interface UseStoredModelsReturn {
  storedModels: StoredModel[];
  isLoading: boolean;
  isRefreshing: boolean;
  loadStoredModels: (forceRefresh?: boolean) => Promise<void>;
  refreshStoredModels: () => Promise<void>;
  rescanStoredModels: () => Promise<void>;
}

export const useStoredModels = (): UseStoredModelsReturn => {
  const [storedModels, setStoredModels] = useState<StoredModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const loadingRef = useRef(false);

  const loadStoredModels = useCallback(async (forceRefresh = false) => {
    console.log('load_models_start', forceRefresh);
    if (loadingRef.current && !forceRefresh) {
      console.log('load_models_skip');
      return;
    }
    loadingRef.current = true;

    try {
      setIsLoading(true);
      console.log('fetching_models');

      const cachedModels = await modelDownloader.getStoredModels();
      console.log('models_fetched', cachedModels.length);

      if (forceRefresh || cachedModels.length === 0) {
        const scannedModels = await modelDownloader.reloadStoredModels();
        console.log('models_scanned', scannedModels.length);
        setStoredModels(scannedModels);
      } else {
        setStoredModels(cachedModels);
      }
    } catch (error) {
      console.log('load_models_error', error);
      setStoredModels([]);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
      console.log('load_models_complete');
    }
  }, []);

  const refreshingRef = useRef(false);

  const refreshStoredModels = useCallback(async () => {
    if (refreshingRef.current) {
      console.log('refresh_skip_already_running');
      return;
    }
    console.log('refresh_storage_cache');
    refreshingRef.current = true;
    setIsRefreshing(true);
    try {
      const models = await modelDownloader.getStoredModels();
      console.log('refresh_complete', models.length);
      setStoredModels(models);
    } finally {
      setIsRefreshing(false);
      refreshingRef.current = false;
    }
  }, []);

  const rescanStoredModels = useCallback(async () => {
    console.log('refresh_storage_rescan');
    setIsRefreshing(true);
    try {
      const models = await modelDownloader.reloadStoredModels();
      console.log('refresh_rescan_complete', models.length);
      setStoredModels(models);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    console.log('hook_mount');
    loadStoredModels();

    const handleModelsChanged = () => {
      console.log('models_changed_event');
      refreshStoredModels();
    };

    modelDownloader.on('modelsChanged', handleModelsChanged);

    return () => {
      console.log('hook_unmount');
      modelDownloader.off('modelsChanged', handleModelsChanged);
    };
  }, [loadStoredModels, refreshStoredModels]);

  return {
    storedModels,
    isLoading,
    isRefreshing,
    loadStoredModels,
    refreshStoredModels,
    rescanStoredModels,
  };
};
