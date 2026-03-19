import React from 'react';
import { StyleSheet, Pressable, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { fontSizes, fontWeights } from '@/theme/typography';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  onPress: () => void;
  children: string;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  fullWidth?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Reusable button component with multiple variants and sizes
 * Supports loading states, icons, and press animations
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  onPress,
  children,
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const buttonStyle = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.disabled,
  ];

  const textColor = getTextColor(variant, disabled || loading);

  return (
    <AnimatedPressable
      style={[buttonStyle, animatedStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon && <Icon name={icon} size={getIconSize(size)} color={textColor} style={styles.icon} />}
          <Text style={[styles.text, { color: textColor }, styles[`${size}Text`]]}>{children}</Text>
        </>
      )}
    </AnimatedPressable>
  );
};

const getTextColor = (variant: ButtonVariant, disabled: boolean): string => {
  if (disabled) return colors.disabled;
  
  switch (variant) {
    case 'primary':
    case 'danger':
      return '#FFFFFF';
    case 'secondary':
      return '#FFFFFF';
    case 'outline':
    case 'ghost':
      return colors.primary;
    default:
      return colors.textPrimary;
  }
};

const getIconSize = (size: ButtonSize): number => {
  switch (size) {
    case 'small':
      return 16;
    case 'medium':
      return 20;
    case 'large':
      return 24;
  }
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.secondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.error,
  },
  small: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    minHeight: 36,
  },
  medium: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 44,
  },
  large: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['2xl'],
    minHeight: 52,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: fontWeights.medium,
  },
  smallText: {
    fontSize: fontSizes.sm,
  },
  mediumText: {
    fontSize: fontSizes.md,
  },
  largeText: {
    fontSize: fontSizes.lg,
  },
  icon: {
    marginRight: spacing.sm,
  },
});
