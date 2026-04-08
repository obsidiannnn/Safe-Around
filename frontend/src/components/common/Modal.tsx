import React, { ReactNode, useEffect } from 'react';
import { View, StyleSheet, Modal as RNModal, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  dismissOnBackdrop?: boolean;
  fullScreen?: boolean;
  noAnimation?: boolean;
}

/**
 * Animated modal component with bottom sheet style
 * Supports backdrop dismiss and safe area handling
 */
export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  children,
  dismissOnBackdrop = true,
  fullScreen = false,
  noAnimation = false,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(noAnimation ? 0 : SCREEN_HEIGHT);
  const opacity = useSharedValue(noAnimation ? 1 : 0);

  useEffect(() => {
    if (noAnimation) {
      if (visible) {
        opacity.value = 1;
        translateY.value = 0;
      } else {
        opacity.value = 0;
        translateY.value = SCREEN_HEIGHT;
        onClose();
      }
      return;
    }

    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, { damping: 20 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 200 }, () => {
        runOnJS(onClose)();
      });
    }
  }, [visible, noAnimation]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <RNModal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={dismissOnBackdrop ? onClose : undefined}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.modal,
            fullScreen
              ? [styles.fullScreen, { paddingBottom: 0 }]
              : [styles.bottomSheet, { paddingBottom: insets.bottom + spacing.lg }],
            modalStyle,
          ]}
        >
          {!fullScreen && <View style={styles.handle} />}
          {children}
        </Animated.View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.backdrop,
  },
  modal: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  bottomSheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: SCREEN_HEIGHT * 0.9,
  },
  fullScreen: {
    height: SCREEN_HEIGHT,
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.pill,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
});
