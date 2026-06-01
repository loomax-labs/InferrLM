import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { ProviderKeysService } from '../services/ProviderKeysService';
import { useRemoteModel } from '../context/RemoteModelContext';
import { ChatLifecycleService } from '../services/ChatLifecycleService';
import { onlineModelService } from '../services/OnlineModelService';
import type { ProviderType } from '../services/ModelManagementService';
import type { ShowDialogFn } from './useDialog';

export const useHomeScreenSettings = (
  activeProvider: ProviderType | null,
  enableRemoteModels: boolean,
  isLoggedIn: boolean,
  showDialog: ShowDialogFn,
  hideDialog: () => void
) => {
  const [selectedModelPath, setSelectedModelPath] = useState<string | null>(null);
  const router = useRouter();

  const getEffectiveSettings = useCallback(async () => {
    return await ChatLifecycleService.getEffectiveSettings(activeProvider);
  }, [activeProvider]);

  useEffect(() => {
    const validateProvider = async () => {
      if (activeProvider && activeProvider !== 'local' && activeProvider !== 'apple-foundation') {
        const validation = await ProviderKeysService.validateApiKey(
          activeProvider, 
          enableRemoteModels, 
          isLoggedIn
        );

        if (!validation.isValid) {
          let title = '';
          let message = '';
          let actions: any[] = [];

          if (validation.errorType === 'remote_disabled') {
            title = 'Remote Models Disabled';
            message = validation.errorMessage || '';
            actions = [
              {
                key: 'cancel',
                text: 'Cancel',
                onPress: hideDialog
              },
              {
                key: 'settings',
                text: 'Go to Settings',
                onPress: () => {
                  hideDialog();
                  router.push('/(tabs)/settings');
                }
              }
            ];
          } else if (validation.errorType === 'no_key') {
            title = 'API Key Required';
            message = validation.errorMessage || '';
            actions = [
              {
                key: 'settings',
                text: 'Go to Settings',
                onPress: () => {
                  hideDialog();
                  router.push('/(tabs)/settings');
                }
              },
              {
                key: 'cancel',
                text: 'Cancel',
                onPress: hideDialog
              }
            ];
          }

          const primary = actions[0] ? { label: actions[0].text, onPress: actions[0].onPress } : undefined;
          const secondary = actions[1] ? { label: actions[1].text, onPress: actions[1].onPress } : undefined;
          showDialog(title, message, primary, secondary);
        }
      }
    };

    validateProvider();
  }, [activeProvider, enableRemoteModels, isLoggedIn]);

  useEffect(() => {
    const recheckApiKeys = async () => {
      await ChatLifecycleService.recheckApiKeys(
        activeProvider,
        enableRemoteModels,
        isLoggedIn,
        onlineModelService,
        (provider) => {
          setSelectedModelPath(provider);
        }
      );
    };

    recheckApiKeys();
  }, [activeProvider, enableRemoteModels, isLoggedIn]);

  return {
    getEffectiveSettings,
    selectedModelPath,
    setSelectedModelPath
  };
};
