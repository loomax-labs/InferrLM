import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { api, storeTokens, clearTokens } from './adapters/ApiClient';
import { storeAuthState, getUserFromSecureStorage, type UserData } from './AuthStorage';
import { logger } from '../utils/logger';

type AuthResult = { success: boolean; error?: string };

type AuthListenerFn = (user: UserData | null) => void;
const listeners: Set<AuthListenerFn> = new Set();

function notifyListeners(user: UserData | null) {
  listeners.forEach((fn) => {
    try { fn(user); } catch {}
  });
}

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'email_already_registered': 'This email is already registered. Try signing in instead.',
  'invalid_credentials': 'Incorrect email or password. Please try again.',
  'account_disabled': 'This account is disabled. Contact support for help.',
  'oauth_account_no_password': 'This account uses social login. Please sign in with Google or Apple.',
  'password_too_weak': 'Your password is too weak. Use at least eight characters with mixed case and a number.',
};

const mapError = (error: any, fallback: string): string => {
  const msg = error?.body?.message || error?.message || '';
  if (AUTH_ERROR_MESSAGES[msg]) return AUTH_ERROR_MESSAGES[msg];
  return fallback;
};

const maskEmail = (email?: string): string | undefined => {
  if (!email || !email.includes('@')) {
    return undefined;
  }
  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}***@${domain}`;
};

let initialized = false;

export const initializeAuth = async (): Promise<void> => {
  if (initialized) return;

  logger.info('auth_init_start', 'auth', {
    params: {
      hasWebClientId: !!process.env.EXPO_PUBLIC_GOOGLE_SIGN_IN_WEB_CLIENT_ID,
      hasIosClientId: !!process.env.EXPO_PUBLIC_GOOGLE_SIGN_IN_IOS_CLIENT_ID,
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
    },
  });

  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_SIGN_IN_WEB_CLIENT_ID!,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_SIGN_IN_IOS_CLIENT_ID,
    offlineAccess: true,
    hostedDomain: '',
    forceCodeForRefreshToken: true,
  });

  initialized = true;
  logger.info('auth_init_done', 'auth');
};

export const isAuthReady = (): boolean => initialized;

export const getCurrentUser = async (): Promise<UserData | null> => {
  return getUserFromSecureStorage();
};

export const isAuthenticated = async (): Promise<boolean> => {
  const user = await getUserFromSecureStorage();
  return !!user;
};

export const onAuthStateChange = (cb: AuthListenerFn): (() => void) => {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
};

/*
  Stores tokens + user profile from backend AuthResult
  and notifies listeners.
*/
async function handleAuthSuccess(data: { accessToken: string; refreshToken: string; user: any }) {
  logger.info('auth_store_start', 'auth', {
    params: {
      userId: data.user?.id,
      provider: data.user?.authProvider,
      emailVerified: data.user?.emailVerified,
      hasAccessToken: typeof data.accessToken === 'string' && data.accessToken.length > 0,
      hasRefreshToken: typeof data.refreshToken === 'string' && data.refreshToken.length > 0,
    },
  });
  await storeTokens(data.accessToken, data.refreshToken);
  const user: UserData = {
    id: data.user.id,
    email: data.user.email,
    emailVerified: data.user.emailVerified,
    displayName: data.user.displayName,
    photoUrl: data.user.photoUrl,
    authProvider: data.user.authProvider,
    trustedEmail: data.user.trustedEmail,
    createdAt: data.user.createdAt,
    lastLoginAt: data.user.lastLoginAt,
  };
  await storeAuthState(user);
  notifyListeners(user);
  logger.info('auth_store_done', 'auth', {
    params: {
      userId: user.id,
      provider: user.authProvider,
      emailVerified: user.emailVerified,
    },
  });
}

export const registerWithEmail = async (
  name: string,
  email: string,
  password: string
): Promise<AuthResult> => {
  try {
    logger.info('auth_register_start', 'auth', {
      endpoint: '/auth/register',
      params: {
        email: maskEmail(email),
        hasName: !!name,
        passwordLength: password.length,
      },
    });

    const data = await api.post('/auth/register', {
      email,
      password,
      displayName: name || undefined,
    }, { auth: false });

    await handleAuthSuccess(data);
    logger.info('auth_register_ok', 'auth', {
      endpoint: '/auth/register',
      params: { userId: data.user?.id },
    });
    return { success: true };
  } catch (error: any) {
    logger.error('auth_register_fail', 'auth', {
      endpoint: '/auth/register',
      status: error?.status,
      params: {
        email: maskEmail(email),
        message: error?.body?.message || error?.message,
      },
    });
    return { success: false, error: mapError(error, 'Registration failed. Please try again.') };
  }
};

export const loginWithEmail = async (
  email: string,
  password: string
): Promise<AuthResult> => {
  try {
    logger.info('auth_login_start', 'auth', {
      endpoint: '/auth/login',
      params: {
        email: maskEmail(email),
        passwordLength: password.length,
      },
    });

    const data = await api.post('/auth/login', { email, password }, { auth: false });
    await handleAuthSuccess(data);
    logger.info('auth_login_ok', 'auth', {
      endpoint: '/auth/login',
      params: { userId: data.user?.id },
    });
    return { success: true };
  } catch (error: any) {
    logger.error('auth_login_fail', 'auth', {
      endpoint: '/auth/login',
      status: error?.status,
      params: {
        email: maskEmail(email),
        message: error?.body?.message || error?.message,
      },
    });
    return { success: false, error: mapError(error, 'Login failed. Please try again.') };
  }
};

export const signInWithGoogle = async (): Promise<AuthResult> => {
  try {
    logger.info('auth_google_start', 'auth');
    await GoogleSignin.hasPlayServices();

    const userInfo = await GoogleSignin.signIn();
    let idToken = (userInfo as any).idToken;

    if (!idToken) {
      const tokens = await GoogleSignin.getTokens();
      idToken = tokens.idToken;
    }

    if (!idToken) {
      logger.warn('auth_google_missing', 'auth');
      return { success: false, error: 'Google sign-in failed. Please try again.' };
    }

    const data = await api.post('/auth/google', { idToken }, { auth: false });
    await handleAuthSuccess(data);
    logger.info('auth_google_ok', 'auth', {
      endpoint: '/auth/google',
      params: { userId: data.user?.id },
    });
    return { success: true };
  } catch (error: any) {
    logger.error('auth_google_fail', 'auth', {
      endpoint: '/auth/google',
      params: {
        code: error?.code,
        message: error?.message,
      },
    });
    let msg = 'Google sign-in failed. Please try again.';
    if (error.code === 'SIGN_IN_CANCELLED') msg = 'Sign-in was cancelled';
    else if (error.code === 'IN_PROGRESS') msg = 'Sign-in already in progress';
    else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') msg = 'Google Play Services not available';
    return { success: false, error: msg };
  }
};

export const signInWithApple = async (): Promise<AuthResult> => {
  try {
    logger.info('auth_apple_start', 'auth');
    const available = await AppleAuthentication.isAvailableAsync();
    if (!available) {
      logger.warn('auth_apple_unavailable', 'auth');
      return { success: false, error: 'Apple Sign-In is not available on this device' };
    }

    const rawNonce = await generateNonce(32);
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce
    );

    const cred = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!cred.identityToken) {
      logger.warn('auth_apple_missing', 'auth');
      return { success: false, error: 'Apple sign-in failed. Please try again.' };
    }

    let fullName: string | undefined;
    if (cred.fullName) {
      const given = cred.fullName.givenName || '';
      const family = cred.fullName.familyName || '';
      fullName = `${given} ${family}`.trim() || undefined;
    }

    const data = await api.post('/auth/apple', {
      identityToken: cred.identityToken,
      nonce: rawNonce,
      fullName,
    }, { auth: false });

    await handleAuthSuccess(data);
    logger.info('auth_apple_ok', 'auth', {
      endpoint: '/auth/apple',
      params: { userId: data.user?.id },
    });
    return { success: true };
  } catch (error: any) {
    logger.error('auth_apple_fail', 'auth', {
      endpoint: '/auth/apple',
      params: {
        code: error?.code,
        message: error?.message,
      },
    });
    let msg = 'Apple sign-in failed. Please try again.';
    if (error?.code === 'ERR_REQUEST_CANCELED' || error?.code === 'ERR_CANCELED') {
      msg = 'Sign-in was cancelled';
    }
    return { success: false, error: msg };
  }
};

export const logoutUser = async (): Promise<AuthResult> => {
  try {
    try {
      await api.post('/auth/logout');
    } catch {}
    
    try { await GoogleSignin.signOut(); } catch {}
    await clearTokens();
    await storeAuthState(null);
    notifyListeners(null);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: 'Logout failed.' };
  }
};

export const sendVerificationEmail = async (): Promise<AuthResult> => {
  try {
    await api.post('/auth/resend-verification');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: mapError(error, 'Failed to send verification email.') };
  }
};

export const getUserProfile = async (): Promise<UserData | null> => {
  try {
    const profile = await api.get<any>('/me');
    const user: UserData = {
      id: profile.id,
      email: profile.email,
      emailVerified: profile.emailVerified,
      displayName: profile.displayName,
      photoUrl: profile.photoUrl,
      authProvider: profile.authProvider,
      trustedEmail: profile.trustedEmail,
      createdAt: profile.createdAt,
      lastLoginAt: profile.lastLoginAt,
    };
    await storeAuthState(user);
    logger.info('auth_profile_ok', 'auth', {
      endpoint: '/me',
      params: {
        userId: user.id,
        emailVerified: user.emailVerified,
      },
    });
    return user;
  } catch (error: any) {
    logger.error('auth_profile_fail', 'auth', {
      endpoint: '/me',
      status: error?.status,
      params: {
        message: error?.body?.message || error?.message,
      },
    });
    return null;
  }
};

async function generateNonce(length = 32): Promise<string> {
  const size = Math.ceil(length / 2);
  const bytes = await Crypto.getRandomBytesAsync(size);
  let result = '';
  for (let i = 0; i < bytes.length; i += 1) {
    result += bytes[i].toString(16).padStart(2, '0');
  }
  return result.slice(0, length);
}
