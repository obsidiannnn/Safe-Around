import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/theme';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  visible: boolean;
  type: ToastType;
  message: string;
  duration?: number;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  visible,
  type,
  message,
  duration = 3000,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(100);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0);
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleDismiss = () => {
    translateY.value = withTiming(100, {}, () => {
      runOnJS(onDismiss)();
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const getConfig = () => {
    switch (type) {
      case 'success':
        return { bg: theme.colors.success, icon: 'checkmark-circle' };
      case 'error':
        return { bg: theme.colors.error, icon: 'close-circle' };
      case 'warning':
        return { bg: theme.colors.warning, icon: 'warning' };
      default:
        return { bg: theme.colors.info, icon: 'information-circle' };
    }
  };

  const config = getConfig();

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { bottom: insets.bottom + 20, backgroundColor: config.bg },
        animatedStyle,
      ]}
    >
      <Ionicons name={config.icon as any} size={24} color="#fff" />
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: theme.spacing.md,
    right: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    gap: theme.spacing.sm,
    zIndex: 9999,
  },
  message: {
    flex: 1,
    fontSize: theme.typography.sizes.md,
    color: '#fff',
    fontWeight: theme.typography.weights.medium,
  },
});
