import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

type BadgeColor = 'red' | 'green' | 'blue' | 'orange' | 'gray';
type BadgeVariant = 'notification' | 'status' | 'count';

interface BadgeProps {
  color?: BadgeColor;
  variant?: BadgeVariant;
  count?: number;
  label?: string;
  showZero?: boolean;
}

/**
 * Badge component for notifications, status, and counts
 * Supports multiple colors and variants
 */
export const Badge: React.FC<BadgeProps> = ({
  color = 'red',
  variant = 'notification',
  count,
  label,
  showZero = false,
}) => {
  const backgroundColor = getBackgroundColor(color);

  if (variant === 'notification' && count !== undefined) {
    if (count === 0 && !showZero) return null;
    
    return (
      <View style={[styles.notification, { backgroundColor }]}>
        {count > 0 && (
          <Text style={styles.notificationText}>{count > 99 ? '99+' : count}</Text>
        )}
      </View>
    );
  }

  if (variant === 'count' && count !== undefined) {
    if (count === 0 && !showZero) return null;
    
    return (
      <View style={[styles.count, { backgroundColor }]}>
        <Text style={styles.countText}>{count > 999 ? '999+' : count}</Text>
      </View>
    );
  }

  if (variant === 'status' && label) {
    return (
      <View style={[styles.status, { backgroundColor }]}>
        <Text style={styles.statusText}>{label}</Text>
      </View>
    );
  }

  return null;
};

const getBackgroundColor = (color: BadgeColor): string => {
  switch (color) {
    case 'red':
      return colors.error;
    case 'green':
      return colors.success;
    case 'blue':
      return colors.secondary;
    case 'orange':
      return colors.warning;
    case 'gray':
      return colors.textSecondary;
  }
};

const styles = StyleSheet.create({
  notification: {
    minWidth: 18,
    height: 18,
    borderRadius: borderRadius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  notificationText: {
    fontSize: 10,
    color: colors.surface,
    fontWeight: '700',
  },
  count: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    fontSize: fontSizes.xs,
    color: colors.surface,
    fontWeight: '600',
  },
  status: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xs,
  },
  statusText: {
    fontSize: fontSizes.xs,
    color: colors.surface,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
