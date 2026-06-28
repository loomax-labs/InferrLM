import React, { ReactNode } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';

type OverlayHostProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

export const OverlayHost = ({ visible, onClose, children }: OverlayHostProps) => {
  const { width, height } = useWindowDimensions();

  if (!visible) {
    return null;
  }

  const body = (
    <View style={[styles.overlay, { width, height }]}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
      <View style={styles.contentLayer} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );

  if (Platform.OS === 'ios') {
    return <FullWindowOverlay>{body}</FullWindowOverlay>;
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
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
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1,
  },
  contentLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
});
