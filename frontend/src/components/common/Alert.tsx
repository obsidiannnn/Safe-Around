import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
  type: AlertType;
  message: string;
  onDismiss?: () => void;
  autoDismiss?: boolean;
  dismissDelay?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

/**
 * Alert component for displaying notifications and messages
 * Supports auto-dismiss and custom actions
 */
export const Alert: React.FC<AlertProps> = ({
  type,
  message,
  onDismiss,
  autoDismiss = false,
  dismissDelay = 3000,
  action,
}) => {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });

    if (autoDismiss && onDismiss) {
      opacity.value = withDelay(
        dismissDelay,
        withTiming(0, { duration: 300 }, () => {
          onDismiss();
        })
      );
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const getAlertConfig = () => {
    switch (type) {
      case 'success':
        return { icon: 'check-circle', color: colors.success };
      case 'error':
        return { icon: 'error', color: colors.error };
      case 'warning':
        return { icon: 'warning', color: colors.warning };
      case 'info':
        return { icon: 'info', color: colors.secondary };
    }
  };

  const config = getAlertConfig();

  return (
    <Animated.View style={[styles.container, { backgroundColor: config.color }, animatedStyle]}>
      <Icon name={config.icon} size={24} color={colors.surface} style={styles.icon} />
      
      <Text style={styles.message}>{message}</Text>
      
      {action && (
        <Pressable onPress={action.onPress} style={styles.actionButton}>
          <Text style={styles.actionText}>{action.label}</Text>
        </Pressable>
      )}
      
      {onDismiss && !autoDismiss && (
        <Pressable onPress={onDismiss} style={styles.closeButton}>
          <Icon name="close" size={20} color={colors.surface} />
        </Pressable>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
  },
  icon: {
    marginRight: spacing.md,
  },
  message: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.surface,
  },
  actionButton: {
    marginLeft: spacing.md,
    paddingHorizontal: spacing.md,
  },
  actionText: {
    fontSize: fontSizes.sm,
    color: colors.surface,
    fontWeight: '600',
  },
  closeButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
});
