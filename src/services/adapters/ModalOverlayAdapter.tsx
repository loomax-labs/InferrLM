import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
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
  children: ReactNode | ((dismiss: () => void) => ReactNode);
};

const fadeInMs = 180;
const fadeOutMs = 200;

const OverlayDismissContext = createContext<(() => void) | null>(null);

export const useOverlayDismiss = () => {
  const dismiss = useContext(OverlayDismissContext);
  if (!dismiss) {
    throw new Error('useOverlayDismiss must be used within OverlayHost');
  }
  return dismiss;
};

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
  const closingRef = useRef(false);
  const contentRef = useRef<ReactNode>(null);

  const runOut = useCallback(
    (done: () => void) => {
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
          done();
        }
      });
    },
    [opacity, scale]
  );

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

  const finishClose = useCallback(() => {
    closingRef.current = false;
    setMounted(false);
  }, []);

  const dismiss = useCallback(() => {
    if (closingRef.current || !mounted) {
      return;
    }

    closingRef.current = true;
    runOut(() => {
      finishClose();
      onClose();
    });
  }, [mounted, onClose, runOut, finishClose]);

  useEffect(() => {
    if (visible) {
      closingRef.current = false;
      setMounted(true);
      return;
    }

    if (!mounted || closingRef.current) {
      return;
    }

    closingRef.current = true;
    runOut(finishClose);
  }, [visible, mounted, runOut, finishClose]);

  useEffect(() => {
    if (mounted && visible) {
      animateIn();
    }
  }, [mounted, visible, animateIn]);

  const panel =
    typeof children === 'function' ? children(dismiss) : children;

  if (visible) {
    contentRef.current = panel;
  }

  const shown = contentRef.current;

  if (!mounted) {
    return null;
  }

  const body = (
    <View style={styles.overlay}>
      <TouchableWithoutFeedback onPress={dismiss}>
        <Animated.View style={[styles.backdrop, { opacity }]} />
      </TouchableWithoutFeedback>
      <Animated.View style={[styles.panelWrap, { opacity, transform: [{ scale }] }]}>
        {shown}
      </Animated.View>
    </View>
  );

  if (Platform.OS === 'ios') {
    return (
      <OverlayDismissContext.Provider value={dismiss}>
        <FullWindowOverlay>{body}</FullWindowOverlay>
      </OverlayDismissContext.Provider>
    );
  }

  return (
    <OverlayDismissContext.Provider value={dismiss}>
      <Modal
        visible
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={dismiss}
      >
        {body}
      </Modal>
    </OverlayDismissContext.Provider>
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
