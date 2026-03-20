import React, { ReactNode } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

interface SwipeAction {
  icon: string;
  color: string;
  onPress: () => void;
}

interface ListItemProps {
  title: string;
  subtitle?: string;
  leftIcon?: string;
  leftComponent?: ReactNode;
  rightIcon?: string;
  rightComponent?: ReactNode;
  onPress?: () => void;
  swipeActions?: {
    left?: SwipeAction;
    right?: SwipeAction;
  };
}

/**
 * List item component with swipe actions
 * Supports left/right icons, avatars, and badges
 */
export const ListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  leftIcon,
  leftComponent,
  rightIcon,
  rightComponent,
  onPress,
  swipeActions,
}) => {
  const translateX = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      if (swipeActions) {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) > 100) {
        if (event.translationX > 0 && swipeActions?.left) {
          swipeActions.left.onPress();
        } else if (event.translationX < 0 && swipeActions?.right) {
          swipeActions.right.onPress();
        }
      }
      translateX.value = withTiming(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const content = (
    <View style={styles.container}>
      {leftIcon && <Icon name={leftIcon} size={24} color={colors.textSecondary} style={styles.leftIcon} />}
      {leftComponent && <View style={styles.leftComponent}>{leftComponent}</View>}
      
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      
      {rightComponent && <View style={styles.rightComponent}>{rightComponent}</View>}
      {rightIcon && <Icon name={rightIcon} size={24} color={colors.textSecondary} />}
    </View>
  );

  if (swipeActions) {
    return (
      <GestureDetector gesture={gesture}>
        <Animated.View style={animatedStyle}>
          {onPress ? (
            <Pressable onPress={onPress} android_ripple={{ color: colors.border }}>
              {content}
            </Pressable>
          ) : (
            content
          )}
        </Animated.View>
      </GestureDetector>
    );
  }

  if (onPress) {
    return (
      <Pressable onPress={onPress} android_ripple={{ color: colors.border }}>
        {content}
      </Pressable>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  leftIcon: {
    marginRight: spacing.md,
  },
  leftComponent: {
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  rightComponent: {
    marginLeft: spacing.md,
  },
});
