import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, AppState, AppStateStatus, ActivityIndicator, Pressable, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../constants/theme';
import AppHeader from '../components/AppHeader';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { getCurrentUser, logoutUser, onAuthStateChange, sendVerificationEmail, getUserProfile, initializeAuth, type UserData } from '../services/AuthService';
import { getUserFromSecureStorage } from '../services/AuthStorage';
import { useRemoteModel } from '../context/RemoteModelContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDialog } from '../context/DialogContext';

export default function ProfileScreen() {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const insets = useSafeAreaInsets();
  const { checkLoginStatus } = useRemoteModel();
  const { showDialog } = useDialog();
  const router = useRouter();
  const [userData, setUserData] = useState({
    displayName: '',
    email: '',
    emailVerified: false,
    creationTime: '',
    lastSignInTime: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const loadingRef = useRef(false);
  const isInitialMount = useRef(true);

  const verificationCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const toDateStr = (val: any): string => {
    if (!val) return '';
    try {
      if (typeof val === 'string') return val;
      return new Date(val).toISOString();
    } catch {
      return '';
    }
  };
  
  const refreshUserData = useCallback(async (showLoader: boolean = false) => {
    try {
      if (showLoader && !loadingRef.current) {
        loadingRef.current = true;
        setIsLoading(true);
      }
      
      const profile = await getUserProfile();
      
      if (profile) {
        setUserData({
          displayName: profile.displayName || 'User',
          email: profile.email || '',
          emailVerified: profile.emailVerified ?? false,
          creationTime: toDateStr(profile.createdAt),
          lastSignInTime: toDateStr(profile.lastLoginAt)
        });
      } else {
        await loadUserData(false);
      }
    } catch (error) {
      await loadUserData(false);
    } finally {
      if (showLoader) {
        loadingRef.current = false;
        setIsLoading(false);
      }
    }
  }, []);
  
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        await initializeAuth();
        await refreshUserData(false);
      }
      appStateRef.current = nextAppState;
    };

    let subscription: { remove: () => void } | undefined;
    
    try {
      subscription = AppState.addEventListener('change', handleAppStateChange);
    } catch (error) {
    }

    return () => {
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }, [refreshUserData]);
  
  useEffect(() => {
    const initializeAndLoad = async () => {
      await initializeAuth();
      await loadUserData(true);
    };
    
    initializeAndLoad();
    
    const unsubscribe = onAuthStateChange(async (user: UserData | null) => {
      if (user && !loadingRef.current) {
        try {
        } catch (error) {
        }
        
        const updatedProfile = await getUserProfile();
        if (updatedProfile) {
          setUserData({
            displayName: updatedProfile.displayName || 'User',
            email: updatedProfile.email || '',
            emailVerified: updatedProfile.emailVerified,
            creationTime: toDateStr(updatedProfile.createdAt),
            lastSignInTime: toDateStr(updatedProfile.lastLoginAt)
          });
        }
      }
    });
    
    return () => {
      unsubscribe();
      if (verificationCheckIntervalRef.current) {
        clearInterval(verificationCheckIntervalRef.current);
      }
    };
  }, []);
  
  useFocusEffect(
    useCallback(() => {
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }
      
      refreshUserData(false);
      
      verificationCheckIntervalRef.current = setInterval(async () => {
        const user = await getCurrentUser();
        if (user && !user.emailVerified) {
          try {
            const fresh = await getUserProfile();
            if (fresh) {
              refreshUserData(false);
            }
          } catch (error) {
            refreshUserData(false);
          }
        } else if (user && user.emailVerified) {
          if (verificationCheckIntervalRef.current) {
            clearInterval(verificationCheckIntervalRef.current);
            verificationCheckIntervalRef.current = null;
          }
        }
      }, 5000);
      
      return () => {
        if (verificationCheckIntervalRef.current) {
          clearInterval(verificationCheckIntervalRef.current);
          verificationCheckIntervalRef.current = null;
        }
      };
    }, [])
  );

  const loadUserData = async (showLoader: boolean = true) => {
    try {
      if (showLoader && !loadingRef.current) {
        loadingRef.current = true;
        setIsLoading(true);
      }
      
      const profile = await getUserFromSecureStorage();
      
      if (profile) {
        setUserData({
          displayName: profile.displayName || 'User',
          email: profile.email || '',
          emailVerified: profile.emailVerified ?? false,
          creationTime: toDateStr(profile.createdAt),
          lastSignInTime: toDateStr(profile.lastLoginAt)
        });
      }
    } catch (error) {
      const stored = await getUserFromSecureStorage();
      if (stored) {
        setUserData({
          displayName: stored.displayName || 'User',
          email: stored.email || '',
          emailVerified: stored.emailVerified ?? false,
          creationTime: toDateStr(stored.createdAt),
          lastSignInTime: toDateStr(stored.lastLoginAt)
        });
      }
    } finally {
      if (showLoader) {
        loadingRef.current = false;
        setIsLoading(false);
      }
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const [emailSentTimestamp, setEmailSentTimestamp] = useState<number | null>(null);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const EMAIL_COOLDOWN_PERIOD = 60000;

  const resendVerificationEmail = async () => {
    if (isResendingEmail) return;
    
    try {
      const user = await getCurrentUser();
      if (!user) {
        showDialog({
          title: 'Error',
          message: 'You must be logged in to verify your email.'
        });
        return;
      }
      
      if (user.emailVerified) {
        showDialog({
          title: 'Already Verified',
          message: 'Your email is already verified.'
        });
        return;
      }

      const currentTime = Date.now();
      if (emailSentTimestamp && (currentTime - emailSentTimestamp < EMAIL_COOLDOWN_PERIOD)) {
        const remainingSeconds = Math.ceil((EMAIL_COOLDOWN_PERIOD - (currentTime - emailSentTimestamp)) / 1000);
        showDialog({
          title: 'Rate Limited',
          message: `Please wait ${remainingSeconds} seconds before requesting another verification email.`
        });
        return;
      }

      setIsResendingEmail(true);
      
      showDialog({
        message: 'Resending verification email...',
        showLoading: true,
        showTitle: false
      });

      const result = await sendVerificationEmail();
      
      if (result.success) {
        setEmailSentTimestamp(currentTime);
        
        showDialog({
          title: 'Verification Email Sent',
          message: 'Please check your email and click the verification link. The status will update automatically once verified.'
        });
      }
      
    } catch (error: any) {
      showDialog({
        title: 'Error',
        message: 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setIsResendingEmail(false);
    }
  };

  const handleDeleteAccount = () => {
    setMenuVisible(false);
    router.push('/delete-account');
  };

  const toggleMenu = () => {
    setMenuVisible((value) => !value);
  };

  const handleSignOut = async () => {
    showDialog({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out?',
      confirmText: 'Sign Out',
      cancelText: 'Cancel',
      onConfirm: async () => {
        const result = await logoutUser();
        if (result.success) {
          setMenuVisible(false);
          await checkLoginStatus();
          router.replace('/(tabs)');
        } else {
          showDialog({
            title: 'Error',
            message: result.error || 'Failed to sign out'
          });
        }
      }
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <AppHeader 
          title="My Profile"
          showBackButton={true}
          showLogo={false}
          rightButtons={[]}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.text }]}>
            Loading profile...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <AppHeader 
        title="My Profile"
        showBackButton={true}
        showLogo={false}
        rightButtons={
          <TouchableOpacity
            style={styles.headerMenuButton}
            onPress={toggleMenu}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons name="dots-vertical" size={22} color={themeColors.headerText} />
          </TouchableOpacity>
        }
      />
      {menuVisible && (
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <View
            style={[
              styles.menuCard,
              {
                backgroundColor: themeColors.background,
                borderColor: themeColors.borderColor,
                top: insets.top + 52,
              },
            ]}
          >
            <TouchableOpacity style={styles.menuItem} onPress={handleDeleteAccount}>
              <MaterialCommunityIcons name="account-remove" size={18} color="#FF5252" />
              <Text style={styles.menuItemText}>Delete Account</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      )}
      <ScrollView contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 20 }]}>
        <View style={[styles.profileHeader, { backgroundColor: themeColors.background }]}>
          <View style={[styles.avatarContainer, { backgroundColor: themeColors.primary + '20' }]}>
            <MaterialCommunityIcons 
              name="account" 
              size={60} 
              color={themeColors.primary} 
            />
          </View>
          <Text style={[styles.displayName, { color: themeColors.text }]}>
            {userData.displayName}
          </Text>
          <Text style={[styles.email, { color: themeColors.secondaryText }]}>
            {userData.email}
          </Text>
          <View style={styles.verificationContainer}>
            <MaterialCommunityIcons 
              name={userData.emailVerified ? "check-circle" : "alert-circle"} 
              size={16} 
              color={userData.emailVerified ? "#4CAF50" : "#FFC107"} 
            />
            <Text style={[styles.verificationText, { 
              color: userData.emailVerified ? "#4CAF50" : "#FFC107" 
            }]}>
              {userData.emailVerified ? "Email Verified" : "Email Not Verified"}
            </Text>
            {!userData.emailVerified && (
              <TouchableOpacity 
                style={[styles.resendButton, isResendingEmail && styles.resendButtonDisabled]}
                onPress={resendVerificationEmail}
                disabled={isResendingEmail}
                accessibilityLabel="Resend verification email"
                accessibilityHint="Sends a new verification email to your address"
              >
                {isResendingEmail ? (
                  <View style={styles.resendButtonContent}>
                    <ActivityIndicator size="small" color="#fff" style={styles.resendButtonLoader} />
                    <Text style={styles.resendButtonText}>Sending...</Text>
                  </View>
                ) : (
                  <Text style={styles.resendButtonText}>Resend Email</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: themeColors.background }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            Account Information
          </Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: themeColors.secondaryText }]}>
              Account Created
            </Text>
            <Text style={[styles.infoValue, { color: themeColors.text }]}>
              {formatDate(userData.creationTime)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: themeColors.secondaryText }]}>
              Last Sign In
            </Text>
            <Text style={[styles.infoValue, { color: themeColors.text }]}>
              {formatDate(userData.lastSignInTime)}
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.signOutButton, { backgroundColor: '#FF5252' + '20' }]}
          onPress={handleSignOut}
        >
          <MaterialCommunityIcons name="logout" size={20} color="#FF5252" />
          <Text style={[styles.signOutText, { color: '#FF5252' }]}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  profileHeader: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    marginBottom: 12,
  },
  verificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  verificationText: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  infoLabel: {
    fontSize: 15,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  headerMenuButton: {
    width: Platform.OS === 'ios' ? 44 : 36,
    height: Platform.OS === 'ios' ? 44 : 36,
    borderRadius: Platform.OS === 'ios' ? 0 : 18,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
  },
  menuCard: {
    position: 'absolute',
    right: 16,
    minWidth: 180,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  menuItemText: {
    color: '#FF5252',
    fontSize: 15,
    fontWeight: '600',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    marginLeft: 10,
    backgroundColor: '#FFC107',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 5,
  },
  resendButtonDisabled: {
    backgroundColor: '#FFC107',
    opacity: 0.7,
  },
  resendButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resendButtonLoader: {
    marginRight: 4,
  },
  resendButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
});
