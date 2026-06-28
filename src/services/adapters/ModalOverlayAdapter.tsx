import React, { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';

type OverlayHostProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

const fadeInMs = 180;
const fadeOutMs = 150;

export const panelElevation: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
  },
  android: {
    elevation: 10,
  },
  default: {},
}) as ViewStyle;

export const OverlayHost = ({ visible, onClose, children }: OverlayHostProps) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;
  const [mounted, setMounted] = useState(false);

  const animateIn = useCallback(() => {
    opacity.setValue(0);
    scale.setValue(0.96);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: fadeInMs,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: fadeInMs,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale]);

  const animateOut = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: fadeOutMs,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.96,
        duration: fadeOutMs,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setMounted(false);
      }
    });
  }, [opacity, scale]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }

    if (mounted) {
      animateOut();
    }
  }, [visible, mounted, animateOut]);

  useEffect(() => {
    if (mounted && visible) {
      animateIn();
    }
  }, [mounted, visible, animateIn]);

  if (!mounted) {
    return null;
  }

  const body = (
    <View style={styles.overlay}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity }]} />
      </TouchableWithoutFeedback>
      <Animated.View style={[styles.panelWrap, { opacity, transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </View>
  );

  if (Platform.OS === 'ios') {
    return <FullWindowOverlay>{body}</FullWindowOverlay>;
  }

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {body}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  panelWrap: {
    zIndex: 1,
    maxWidth: '100%',
  },
});
