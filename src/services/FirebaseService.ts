export {
  initializeAuth as initializeFirebase,
  isAuthReady as isFirebaseReady,
  getCurrentUser as waitForAuthReady,
  registerWithEmail,
  loginWithEmail,
  signInWithGoogle,
  signInWithApple,
  logoutUser,
  getCurrentUser,
  isAuthenticated,
  getUserProfile,
  onAuthStateChange,
  sendVerificationEmail,
  type UserData
} from './AuthService';

export {
  getUserFromSecureStorage,
  storeAuthState
} from './AuthStorage';

export {
  validateEmail,
  validatePassword,
  validateName,
  validateReportContent,
  validateProvider,
  validateCategory,
  sanitizeInput,
  checkRateLimiting,
  incrementAuthAttempts,
  resetAuthAttempts,
  isEmailFromTrustedProvider
} from './SecurityUtils';
