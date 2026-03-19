import React, { ReactNode, useEffect } from 'react';
import { View, StyleSheet, Modal, Pressable, Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
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

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  snapPoints?: number[];
  dismissOnBackdrop?: boolean;
}

/**
 * Draggable bottom sheet component with snap points
 * Supports gesture-based dismissal and backdrop
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  children,
  snapPoints = [0.5, 0.9],
  dismissOnBackdrop = true,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const opacity = useSharedValue(0);
  const currentSnapPoint = useSharedValue(snapPoints[0]);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(SCREEN_HEIGHT * (1 - snapPoints[0]), { damping: 20 });
      currentSnapPoint.value = snapPoints[0];
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 200 });
    }
  }, [visible]);

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      const newTranslateY = SCREEN_HEIGHT * (1 - currentSnapPoint.value) + event.translationY;
      if (newTranslateY >= 0) {
        translateY.value = newTranslateY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 100) {
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 200 });
        opacity.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(SCREEN_HEIGHT * (1 - currentSnapPoint.value), {
          damping: 20,
        });
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={dismissOnBackdrop ? onClose : undefined}
          />
        </Animated.View>

        <GestureDetector gesture={gesture}>
          <Animated.View
            style={[
              styles.sheet,
              { paddingBottom: insets.bottom + spacing.lg },
              sheetStyle,
            ]}
          >
            <View style={styles.handle} />
            {children}
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.backdrop,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    minHeight: SCREEN_HEIGHT * 0.3,
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
