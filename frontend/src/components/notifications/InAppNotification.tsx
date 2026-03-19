import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/theme';

interface InAppNotificationProps {
  visible: boolean;
  icon: string;
  title: string;
  body: string;
  onPress?: () => void;
  onDismiss: () => void;
  autoDismiss?: boolean;
  duration?: number;
}

export const InAppNotification: React.FC<InAppNotificationProps> = ({
  visible,
  icon,
  title,
  body,
  onPress,
  onDismiss,
  autoDismiss = true,
  duration = 5000,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-200);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0);
      
      if (autoDismiss) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      translateY.value = withTiming(-200);
    }
  }, [visible]);

  const handleDismiss = () => {
    translateY.value = withTiming(-200, {}, () => {
      runOnJS(onDismiss)();
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { top: insets.top }, animatedStyle]}>
      <TouchableOpacity
        style={styles.content}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={icon as any} size={24} color={theme.colors.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {body}
          </Text>
        </View>
        <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
          <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: theme.spacing.md,
    right: theme.spacing.md,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${theme.colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  body: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
});
