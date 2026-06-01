import * as SecureStore from 'expo-secure-store';

export type UserData = {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
  photoUrl: string | null;
  authProvider: string;
  trustedEmail: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};

export const USER_AUTH_KEY = 'inferra_secure_user_auth_state';

export const AUTH_SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  requireAuthentication: false,
  authenticationPrompt: 'Authenticate to access your account',
  keychainService: 'inferra_auth',
};

export const storeAuthState = async (user: UserData | null): Promise<boolean> => {
  try {
    if (!user) {
      await SecureStore.deleteItemAsync(USER_AUTH_KEY, AUTH_SECURE_STORE_OPTIONS);
      return true;
    }

    await SecureStore.setItemAsync(USER_AUTH_KEY, JSON.stringify(user), AUTH_SECURE_STORE_OPTIONS);
    return true;
  } catch (error) {
    if (__DEV__) {
      console.error('secure_storage_error', error);
    }
    return false;
  }
};

export const getUserFromSecureStorage = async (): Promise<UserData | null> => {
  try {
    const raw = await SecureStore.getItemAsync(USER_AUTH_KEY, AUTH_SECURE_STORE_OPTIONS);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed.id) {
      await SecureStore.deleteItemAsync(USER_AUTH_KEY, AUTH_SECURE_STORE_OPTIONS);
      return null;
    }

    return parsed;
  } catch {
    await SecureStore.deleteItemAsync(USER_AUTH_KEY, AUTH_SECURE_STORE_OPTIONS);
    return null;
  }
}; 
