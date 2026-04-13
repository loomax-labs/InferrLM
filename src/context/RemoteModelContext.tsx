import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { isAuthenticated, getCurrentUser, isAuthReady, onAuthStateChange } from '../services/AuthService';
import { getUserFromSecureStorage, type UserData } from '../services/AuthStorage';
import providerKeyStorage from '../utils/ProviderKeyStorage';
import { logger } from '../utils/logger';

const REMOTE_MODELS_KEY = 'remote_models_enabled';

interface RemoteModelContextType {
  enableRemoteModels: boolean;
  toggleRemoteModels: () => Promise<{ success: boolean, requiresLogin?: boolean, emailNotVerified?: boolean }>;
  isLoggedIn: boolean;
  checkLoginStatus: () => Promise<boolean>;
  disableRemoteModels: (persist?: boolean) => Promise<void>;
}

const RemoteModelContext = createContext<RemoteModelContextType>({
  enableRemoteModels: false,
  toggleRemoteModels: async () => ({ success: false }),
  isLoggedIn: false,
  checkLoginStatus: async () => false,
  disableRemoteModels: async () => {},
});

export const RemoteModelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [enableRemoteModels, setEnableRemoteModels] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  const loadPref = useCallback(async () => {
    try {
      await providerKeyStorage.initialize();
      const saved = await providerKeyStorage.getPreference(REMOTE_MODELS_KEY);
      if (saved !== null) {
        setEnableRemoteModels(saved === 'true');
      }
    } catch {
    }
  }, []);

  const setPref = useCallback(async (val: boolean, persist: boolean): Promise<boolean> => {
    setEnableRemoteModels(val);
    if (!persist) {
      return true;
    }
    try {
      await providerKeyStorage.initialize();
      await providerKeyStorage.setPreference(REMOTE_MODELS_KEY, val ? 'true' : 'false');
      return true;
    } catch {
      return false;
    }
  }, []);

  const disableRemoteModels = useCallback(async (persist: boolean = true): Promise<void> => {
    await setPref(false, persist);
  }, [setPref]);

  const checkLoginStatus = useCallback(async () => {
    try {
      if (!isAuthReady()) {
        logger.warn('auth_state_unready', 'auth');
        setIsLoggedIn(false);
        return false;
      }

      const authenticated = await isAuthenticated();
      logger.info('auth_state_check', 'auth', {
        params: { authenticated },
      });
      setIsLoggedIn(authenticated);

      if (!authenticated) {
        const storedUser = await getUserFromSecureStorage();
        const logged = !!storedUser;
        logger.info('auth_state_cache', 'auth', {
          params: {
            logged,
            userId: storedUser?.id,
            emailVerified: storedUser?.emailVerified,
          },
        });
        setIsLoggedIn(logged);

        if (!logged) {
          await disableRemoteModels(false);
          return false;
        }

        await loadPref();
        return true;
      }

      await loadPref();
      logger.info('auth_state_ok', 'auth');
      return true;
    } catch (error: any) {
      logger.error('auth_state_fail', 'auth', {
        params: { message: error?.message },
      });
      setIsLoggedIn(false);
      await disableRemoteModels(false);
      return false;
    }
  }, [disableRemoteModels, loadPref]);

  useEffect(() => {
    loadPref();
    checkLoginStatus();

    if (!isAuthReady()) {
      return;
    }

    try {
      const unsubscribe = onAuthStateChange(async (user: UserData | null) => {
        const logged = !!user;
        logger.info('auth_state_change', 'auth', {
          params: {
            logged,
            userId: user?.id,
            emailVerified: user?.emailVerified,
          },
        });
        setIsLoggedIn(logged);

        if (!logged) {
          await disableRemoteModels(false);
          return;
        }

        await loadPref();
      });

      return () => unsubscribe();
    } catch {
      
    }
  }, [checkLoginStatus, disableRemoteModels, loadPref]);

  const toggleRemoteModels = async () => {
    if (!enableRemoteModels) {
      const logged = await checkLoginStatus();
      if (!logged) {
        return { success: false, requiresLogin: true };
      }

      const user = await getCurrentUser();
      if (user && !user.emailVerified) {
        return { success: false, emailNotVerified: true };
      }
    }

    const next = !enableRemoteModels;
    const ok = await setPref(next, true);
    return { success: ok };
  };

  return (
    <RemoteModelContext.Provider value={{
      enableRemoteModels,
      toggleRemoteModels,
      isLoggedIn,
      checkLoginStatus,
      disableRemoteModels
    }}>
      {children}
    </RemoteModelContext.Provider>
  );
};

export const useRemoteModel = () => {
  const context = useContext(RemoteModelContext);
  if (!context) {
    throw new Error('useRemoteModel must be used within a RemoteModelProvider');
  }
  return context;
};
