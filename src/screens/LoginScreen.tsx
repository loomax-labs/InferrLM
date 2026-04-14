import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../constants/theme';
import { useRemoteModel } from '../context/RemoteModelContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  TextInput, 
  Text, 
  Surface, 
  Button, 
  HelperText, 
  Divider,
} from 'react-native-paper';
import Dialog from '../components/Dialog';
import { loginWithEmail, restorePendingAccount, signInWithGoogle, signInWithApple, type AuthResult } from '../services/AuthService';
import * as AppleAuthentication from 'expo-apple-authentication';
import { logger } from '../utils/logger';

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
  route: { params: { redirectTo?: string; redirectParams?: any } };
};

export default function LoginScreen({ navigation, route }: LoginScreenProps) {
  const { theme: currentTheme } = useTheme();
  const { checkLoginStatus } = useRemoteModel();
  const themeColors = theme[currentTheme];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isAppleSignInAvailable, setIsAppleSignInAvailable] = useState(false);
  const [restoreDialogVisible, setRestoreDialogVisible] = useState(false);
  const [restoreToken, setRestoreToken] = useState<string | null>(null);
  const [scheduledDeletionAt, setScheduledDeletionAt] = useState<string | null>(null);
  const [restoreProvider, setRestoreProvider] = useState<'email' | 'google' | 'apple'>('email');

  const redirectAfterLogin = route.params?.redirectTo || 'MainTabs';
  const redirectParams = route.params?.redirectParams || { screen: 'HomeTab' };

  const navigateAfterAuth = () => {
    if (redirectAfterLogin === 'MainTabs') {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs', params: redirectParams as any }],
      });
      return;
    }

    navigation.reset({
      index: 1,
      routes: [
        { name: 'MainTabs', params: { screen: 'HomeTab' } as any },
        { name: redirectAfterLogin as any, params: redirectParams as any },
      ],
    });
  };

  const navigateToRegister = () => {
    navigation.navigate('Register', {
      redirectTo: route.params?.redirectTo,
      redirectParams: route.params?.redirectParams
    });
  };

  const formatDeletionDate = (value?: string | null) => {
    if (!value) {
      return 'within the 30-day recovery window';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'within the 30-day recovery window';
    }

    return `until ${date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })}`;
  };

  const resetRestoreDialog = () => {
    setRestoreDialogVisible(false);
    setRestoreToken(null);
    setScheduledDeletionAt(null);
    setRestoreProvider('email');
  };

  const closeRestoreDialog = () => {
    if (isRestoring) {
      return;
    }

    resetRestoreDialog();
  };

  const promptRestore = (result: AuthResult, provider: 'email' | 'google' | 'apple') => {
    const nextRestoreToken = result.pendingDeletion?.restoreToken;
    if (!nextRestoreToken) {
      setError(result.error || 'This account is scheduled for deletion.');
      return;
    }

    logger.info('ui_restore_prompt', 'auth', {
      params: {
        provider,
        scheduledDeletionAt: result.pendingDeletion?.scheduledDeletionAt,
      },
    });
    setRestoreToken(nextRestoreToken);
    setScheduledDeletionAt(result.pendingDeletion?.scheduledDeletionAt || null);
    setRestoreProvider(provider);
    setRestoreDialogVisible(true);
  };

  const completeLogin = async (provider: 'email' | 'google' | 'apple') => {
    const logged = await checkLoginStatus();
    logger.info(`ui_${provider}_state`, 'auth', {
      params: { logged, redirect: redirectAfterLogin },
    });
    navigateAfterAuth();
  };

  const handleRestoreAccount = async () => {
    if (!restoreToken || isRestoring) {
      return;
    }

    try {
      setIsRestoring(true);
      setError(null);

      const result = await restorePendingAccount(restoreToken);
      if (result.success) {
        resetRestoreDialog();
        logger.info('ui_restore_done', 'auth', {
          params: { redirect: redirectAfterLogin, provider: restoreProvider },
        });
        await completeLogin(restoreProvider);
        return;
      }

      logger.warn('ui_restore_fail', 'auth', {
        params: { message: result.error, code: result.code },
      });
      resetRestoreDialog();
      setError(result.error || 'Account restore failed. Please try again.');
    } catch (err: any) {
      logger.error('ui_restore_error', 'auth', {
        params: { message: err?.message },
      });
      resetRestoreDialog();
      setError('Account restore failed. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (Platform.OS !== 'ios') {
      return () => {
        active = false;
      };
    }
    AppleAuthentication.isAvailableAsync()
      .then((available: boolean) => {
        if (active) {
          setIsAppleSignInAvailable(available);
        }
      })
      .catch(() => {
        if (active) {
          setIsAppleSignInAvailable(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);


  const handleLogin = async () => {
    if (!email.trim()) {
      logger.warn('ui_login_email', 'auth');
      setError('Email is required');
      return;
    }

    if (!password.trim()) {
      logger.warn('ui_login_password', 'auth');
      setError('Password is required');
      return;
    }

    try {
      logger.info('ui_login_start', 'auth', {
        params: {
          email: `${email.trim().toLowerCase().slice(0, 2)}***`,
          redirect: redirectAfterLogin,
        },
      });
      setIsLoading(true);
      setError(null);

      const result = await loginWithEmail(email.trim().toLowerCase(), password.trim());
      
      if (result.success) {
        await completeLogin('email');
      } else if (result.code === 'account_pending_deletion') {
        promptRestore(result, 'email');
      } else {
        logger.warn('ui_login_fail', 'auth', {
          params: { message: result.error, code: result.code },
        });
        setError(result.error || 'Login failed. Please try again.');
      }
    } catch (err: any) {
      logger.error('ui_login_error', 'auth', {
        params: { message: err?.message },
      });
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      logger.info('ui_google_start', 'auth', {
        params: { redirect: redirectAfterLogin },
      });
      setIsLoading(true);
      setError(null);
      
      const result = await signInWithGoogle();
      
      if (result.success) {
        await completeLogin('google');
      } else if (result.code === 'account_pending_deletion') {
        promptRestore(result, 'google');
      } else {
        logger.warn('ui_google_fail', 'auth', {
          params: { message: result.error, code: result.code },
        });
        setError(result.error || 'Google sign-in failed. Please try again.');
      }
    } catch (err: any) {
      logger.error('ui_google_error', 'auth', {
        params: { message: err?.message },
      });
      setError('Google sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      if (isLoading) {
        return;
      }
      logger.info('ui_apple_start', 'auth', {
        params: { redirect: redirectAfterLogin },
      });
      setIsLoading(true);
      setError(null);

      const result = await signInWithApple();

      if (result.success) {
        await completeLogin('apple');
      } else if (result.code === 'account_pending_deletion') {
        promptRestore(result, 'apple');
      } else {
        logger.warn('ui_apple_fail', 'auth', {
          params: { message: result.error, code: result.code },
        });
        setError(result.error || 'Apple sign-in failed. Please try again.');
      }
    } catch (err: any) {
      logger.error('ui_apple_error', 'auth', {
        params: { message: err?.message },
      });
      setError('Apple sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#660880' }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerContainer}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialCommunityIcons 
                name="arrow-left" 
                size={24} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
          </View>

          <Surface style={styles.formSurface} elevation={2}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.logoImage}
                
              />
              <Text style={styles.logoText} variant="headlineMedium">
                Welcome Back
              </Text>
              <Text style={styles.subtitle} variant="bodyMedium">
                Sign in to your account
              </Text>
            </View>

            <View style={styles.formContainer}>
              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                left={<TextInput.Icon icon="email" />}
              />

              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                style={styles.input}
                secureTextEntry={!showPassword}
                right={
                  <TextInput.Icon
                    icon={showPassword ? "eye-off" : "eye"}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                left={<TextInput.Icon icon="lock" />}
              />

              {error && (
                <HelperText type="error" visible={!!error}>
                  {error}
                </HelperText>
              )}

              <Button
                mode="contained"
                onPress={handleLogin}
                disabled={isLoading}
                style={styles.loginButton}
                contentStyle={styles.buttonContent}
                loading={isLoading}
                buttonColor="#8A2BE2"
                textColor={currentTheme === 'dark' ? '#FFFFFF' : undefined}
              >
                Sign In
              </Button>
              
              <View style={styles.socialContainer}>
                <Text variant="bodySmall" style={styles.dividerText}>Or sign in with</Text>
                
                <Button
                  mode="outlined"
                  icon="google"
                  style={styles.socialButton}
                  contentStyle={styles.socialButtonContent}
                  onPress={handleGoogleSignIn}
                  disabled={isLoading}
                >
                  Google
                </Button>
                {isAppleSignInAvailable && (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={8}
                    style={styles.appleButton}
                    onPress={handleAppleSignIn}
                  />
                )}
              </View>
              
              <Divider style={styles.divider} />
              
              <View style={styles.registerContainer}>
                <Text variant="bodyMedium">
                  Don't have an account?
                </Text>
                <Button 
                  mode="text" 
                  onPress={navigateToRegister}
                  style={styles.registerButton}
                >
                  Sign Up
                </Button>
              </View>
            </View>
          </Surface>

        </ScrollView>
      </KeyboardAvoidingView>

      <Dialog
        visible={restoreDialogVisible}
        onDismiss={closeRestoreDialog}
        title="Restore account?"
        description={`This account is still scheduled for deletion ${formatDeletionDate(scheduledDeletionAt)}. Do you want to cancel the scheduled deletion and restore it now?`}
        primaryButtonText="Restore Account"
        primaryButtonColor="#8A2BE2"
        primaryButtonLoading={isRestoring}
        onPrimaryPress={handleRestoreAccount}
        secondaryButtonText="Not Now"
        secondaryButtonColor="#6B6B6B"
        onSecondaryPress={closeRestoreDialog}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
  },
  backButton: {
    padding: 8,
  },
  formSurface: {
    borderRadius: 16,
    padding: 24,
    marginVertical: 10,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
    borderRadius: 40,
  },
  logoText: {
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
  },
  subtitle: {
    opacity: 0.7,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  input: {
    marginBottom: 16,
  },
  loginButton: {
    marginTop: 8,
    borderRadius: 8,
  },
  buttonContent: {
    height: 48,
  },
  divider: {
    marginVertical: 24,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerButton: {
    marginLeft: 4,
  },
  demoNote: {
    textAlign: 'center',
    opacity: 0.9,
    marginTop: 24,
    marginBottom: 16,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  socialContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  dividerText: {
    marginBottom: 16,
    opacity: 0.7,
  },
  socialButton: {
    width: '100%',
    marginBottom: 12,
    borderColor: '#8A2BE2',
    borderRadius: 8,
  },
  socialButtonContent: {
    height: 43,
  },
  appleButton: {
    width: '100%',
    height: 48,
  },
}); 
