import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  StyleSheet,
  StyleProp,
  Text,
  TextStyle,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useColorScheme,
  ViewStyle,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../constants/theme';

interface DialogProps {
  visible: boolean;
  onClose?: () => void;
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
  title?: string;
  description?: string;
  points?: string[];
  iconName?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconColor?: string;
  buttonText?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  primaryButtonText?: string;
  primaryButtonColor?: string;
  primaryButtonTextColor?: string;
  primaryButtonLoading?: boolean;
  primaryButtonDisabled?: boolean;
  onPrimaryPress?: () => void;
  secondaryButtonText?: string;
  secondaryButtonColor?: string;
  secondaryButtonTextColor?: string;
  onSecondaryPress?: () => void;
  dismissOnBackdropPress?: boolean;
  maxWidth?: number;
  children?: React.ReactNode;
}

interface DialogTitleProps {
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

interface DialogContentProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

interface DialogActionsProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

type DialogComponent = React.FC<DialogProps> & {
  Title: React.FC<DialogTitleProps>;
  Content: React.FC<DialogContentProps>;
  Actions: React.FC<DialogActionsProps>;
};

const AppDialog = (({
  visible,
  onClose,
  onDismiss,
  style,
  title,
  description,
  points = [],
  iconName,
  iconColor,
  buttonText,
  buttonColor,
  buttonTextColor = '#fff',
  primaryButtonText,
  primaryButtonColor,
  primaryButtonTextColor,
  primaryButtonLoading = false,
  primaryButtonDisabled = false,
  onPrimaryPress,
  secondaryButtonText,
  secondaryButtonColor,
  secondaryButtonTextColor = '#fff',
  onSecondaryPress,
  dismissOnBackdropPress = false,
  maxWidth = 400,
  children,
}: DialogProps) => {
  const { theme: currentTheme } = useTheme();
  const systemScheme = useColorScheme();
  const resolvedTheme: 'light' | 'dark' =
    currentTheme === 'light' || currentTheme === 'dark'
      ? currentTheme
      : systemScheme ?? 'light';
  const themeColors = theme[resolvedTheme];
  const hasDualButtons = !!primaryButtonText && !!secondaryButtonText;
  const hasPrimaryOnly = !!primaryButtonText && !secondaryButtonText;
  const hasLegacyBtn = !!buttonText && !primaryButtonText;
  const close = onClose || onDismiss;
  const defaultSecondaryBg =
    resolvedTheme === 'light' ? themeColors.secondaryText : themeColors.cardBackground;
  const defaultSecondaryText =
    resolvedTheme === 'light' ? '#fff' : themeColors.text;
  const isManagedDialog =
    !!iconName ||
    !!title ||
    !!description ||
    points.length > 0 ||
    hasDualButtons ||
    hasPrimaryOnly ||
    hasLegacyBtn;

  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      opacity.setValue(0);
      scale.setValue(0.88);
      setShow(true);
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.88,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setShow(false);
      });
    }
  }, [visible]);

  const animateIn = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 22,
        stiffness: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Modal
      visible={show}
      transparent
      animationType="none"
      onShow={animateIn}
      onRequestClose={close}
    >
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback
          onPress={dismissOnBackdropPress ? close : undefined}
        >
          <Animated.View style={[styles.backdrop, { opacity }]} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.modalContent,
            { backgroundColor: themeColors.background, maxWidth },
            style,
            { opacity, transform: [{ scale }] },
          ]}
        >
          {isManagedDialog ? (
            <>
              <View style={styles.modalHeader}>
                {iconName && (
                  <MaterialCommunityIcons
                    name={iconName}
                    size={24}
                    color={iconColor || themeColors.primary}
                  />
                )}
                {!!title && (
                  <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                    {title}
                  </Text>
                )}
              </View>

              {!!description && (
                <Text style={[styles.modalText, { color: themeColors.text }]}>
                  {description}
                </Text>
              )}

              {points.length > 0 && (
                <View style={styles.bulletPoints}>
                  {points.map((point, index) => (
                    <Text
                      key={`${point}-${index}`}
                      style={[styles.bulletPoint, { color: themeColors.text }]}
                    >
                      {point}
                    </Text>
                  ))}
                </View>
              )}

              {children}

              {hasDualButtons ? (
                <View style={styles.dualButtonRow}>
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.secondaryButton,
                      { backgroundColor: secondaryButtonColor || defaultSecondaryBg },
                    ]}
                    onPress={onSecondaryPress || close}
                  >
                    <Text
                      style={[
                        styles.modalButtonText,
                        { color: secondaryButtonTextColor || defaultSecondaryText },
                      ]}
                    >
                      {secondaryButtonText}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.primaryButton,
                      {
                        backgroundColor: primaryButtonColor || themeColors.primary,
                        opacity: primaryButtonDisabled ? 0.5 : 1,
                      },
                    ]}
                    onPress={onPrimaryPress || close}
                    disabled={primaryButtonDisabled || primaryButtonLoading}
                  >
                    {primaryButtonLoading ? (
                      <ActivityIndicator size="small" color={primaryButtonTextColor || buttonTextColor} />
                    ) : (
                      <Text
                        style={[
                          styles.modalButtonText,
                          { color: primaryButtonTextColor || buttonTextColor },
                        ]}
                      >
                        {primaryButtonText}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (hasPrimaryOnly || hasLegacyBtn) ? (
                <View style={styles.dualButtonRow}>
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.primaryButton,
                      {
                        flex: 1,
                        backgroundColor: (hasPrimaryOnly ? primaryButtonColor : buttonColor) || themeColors.primary,
                        opacity: primaryButtonDisabled ? 0.5 : 1,
                      },
                    ]}
                    onPress={(hasPrimaryOnly ? onPrimaryPress : undefined) || close}
                    disabled={primaryButtonDisabled || primaryButtonLoading}
                  >
                    {primaryButtonLoading ? (
                      <ActivityIndicator size="small" color={primaryButtonTextColor || buttonTextColor} />
                    ) : (
                      <Text style={[styles.modalButtonText, { color: (hasPrimaryOnly ? primaryButtonTextColor : undefined) || buttonTextColor }]}>
                        {hasPrimaryOnly ? primaryButtonText : buttonText}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : null}
            </>
          ) : (
            children
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}) as DialogComponent;

const DialogTitle: React.FC<DialogTitleProps> = ({ children, style }) => {
  const { theme: currentTheme } = useTheme();
  const systemScheme = useColorScheme();
  const resolvedTheme: 'light' | 'dark' =
    currentTheme === 'light' || currentTheme === 'dark'
      ? currentTheme
      : systemScheme ?? 'light';
  const themeColors = theme[resolvedTheme];

  return <Text style={[styles.compoundTitle, { color: themeColors.text }, style]}>{children}</Text>;
};

const DialogContent: React.FC<DialogContentProps> = ({ children, style }) => {
  return <View style={[styles.compoundContent, style]}>{children}</View>;
};

const DialogActions: React.FC<DialogActionsProps> = ({ children, style }) => {
  return <View style={[styles.compoundActions, style]}>{children}</View>;
};

AppDialog.Title = DialogTitle;
AppDialog.Content = DialogContent;
AppDialog.Actions = DialogActions;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    flexShrink: 1,
  },
  modalText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  bulletPoints: {
    marginVertical: 12,
    paddingLeft: 8,
  },
  bulletPoint: {
    fontSize: 15,
    lineHeight: 24,
  },
  modalButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  dualButtonRow: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 7,
    marginTop: 0,
  },
  secondaryButton: {
    flex: 3,
    marginTop: 0,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  compoundTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  compoundContent: {
    marginBottom: 12,
  },
  compoundActions: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
});

export default AppDialog;
