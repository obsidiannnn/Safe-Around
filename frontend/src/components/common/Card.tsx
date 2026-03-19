import React, { ReactNode } from 'react';
import { View, StyleSheet, Pressable, Image, ImageSourcePropType } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '@/theme/colors';
import { spacing, borderRadius, shadows } from '@/theme/spacing';

type CardVariant = 'elevated' | 'outlined' | 'filled';

interface CardProps {
  variant?: CardVariant;
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  image?: ImageSourcePropType;
  padding?: keyof typeof spacing;
  onPress?: () => void;
}

/**
 * Reusable card component with multiple variants
 * Supports header, footer, image, and interactive press handling
 */
export const Card: React.FC<CardProps> = ({
  variant = 'elevated',
  children,
  header,
  footer,
  image,
  padding = 'lg',
  onPress,
}) => {
  const cardStyle = [
    styles.card,
    styles[variant],
    { padding: spacing[padding] },
  ];

  const content = (
    <>
      {image && <Image source={image} style={styles.image} resizeMode="cover" />}
      {header && <View style={styles.header}>{header}</View>}
      <View style={styles.content}>{children}</View>
      {footer && <View style={styles.footer}>{footer}</View>}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        style={cardStyle}
        onPress={onPress}
        accessibilityRole="button"
        android_ripple={{ color: colors.border }}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{content}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  elevated: {
    backgroundColor: colors.surface,
    ...shadows.medium,
  },
  outlined: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filled: {
    backgroundColor: colors.background,
  },
  image: {
    width: '100%',
    height: 200,
    marginBottom: spacing.md,
  },
  header: {
    marginBottom: spacing.md,
  },
  content: {
    flex: 1,
  },
  footer: {
    marginTop: spacing.md,
  },
});
