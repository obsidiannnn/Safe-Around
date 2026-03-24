import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { spacing, borderRadius, shadows } from '@/theme/spacing';

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
        return colors.success;
      case 'warning':
        return colors.warning;
      default:
        return colors.primary;
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.iconBox, { backgroundColor: `${getColor()}15` }]}>
        <Ionicons name={icon as any} size={24} color={getColor()} />
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.valueRow}>
          <Text style={styles.value}>{value}</Text>
          {trend && (
            <View style={[styles.trendBadge, { backgroundColor: trend === 'up' ? `${colors.success}15` : `${colors.error}15` }]}>
              <Ionicons
                name={trend === 'up' ? 'trending-up' : 'trending-down'}
                size={14}
                color={trend === 'up' ? colors.success : colors.error}
              />
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.medium,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    flexDirection: 'column',
    alignItems: 'flex-start',
    minWidth: '45%',
    flex: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  content: {
    width: '100%',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  trendBadge: {
    padding: 4,
    borderRadius: 6,
  },
});
