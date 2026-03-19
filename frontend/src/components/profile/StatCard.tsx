import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/theme';

interface StatCardProps {
  icon: string;
  value: number | string;
  label: string;
  trend?: 'up' | 'down';
  variant?: 'primary' | 'success' | 'warning';
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  value,
  label,
  trend,
  variant = 'primary',
}) => {
  const getColor = () => {
    switch (variant) {
      case 'success':
        return theme.colors.success;
      case 'warning':
        return theme.colors.warning;
      default:
        return theme.colors.primary;
    }
  };

  return (
    <View style={styles.container}>
      <Ionicons name={icon as any} size={32} color={getColor()} />
      <View style={styles.content}>
        <View style={styles.valueRow}>
          <Text style={styles.value}>{value}</Text>
          {trend && (
            <Ionicons
              name={trend === 'up' ? 'trending-up' : 'trending-down'}
              size={20}
              color={trend === 'up' ? theme.colors.success : theme.colors.error}
            />
          )}
        </View>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.md,
  },
  content: {
    flex: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  value: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  label: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
});
