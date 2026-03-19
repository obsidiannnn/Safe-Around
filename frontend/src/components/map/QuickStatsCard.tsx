import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BottomSheet } from '@/components/common';
import { AreaStats } from '@/types/models';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

interface QuickStatsCardProps {
  visible: boolean;
  onClose: () => void;
  stats: AreaStats | null;
  onViewCrimeHistory: () => void;
  onPlanSafeRoute: () => void;
  onReportIncident: () => void;
}

/**
 * Draggable bottom sheet with area statistics and quick actions
 * Shows safety score, nearby users, and recent alerts
 */
export const QuickStatsCard: React.FC<QuickStatsCardProps> = ({
  visible,
  onClose,
  stats,
  onViewCrimeHistory,
  onPlanSafeRoute,
  onReportIncident,
}) => {
  const getSafetyColor = (score: number): string => {
    if (score >= 80) return colors.success;
    if (score >= 60) return '#FDD835';
    if (score >= 40) return colors.warning;
    return colors.error;
  };

  const safetyColor = stats ? getSafetyColor(stats.safetyScore) : colors.textSecondary;

  return (
    <BottomSheet visible={visible} onClose={onClose} snapPoints={[0.2, 0.5, 0.9]}>
      <View style={styles.container}>
        <Text style={styles.title}>Area Safety</Text>

        {stats ? (
          <>
            <View style={styles.scoreContainer}>
              <View style={[styles.scoreCircle, { borderColor: safetyColor }]}>
                <Text style={[styles.scoreValue, { color: safetyColor }]}>
                  {stats.safetyScore}
                </Text>
                <Text style={styles.scoreLabel}>/ 100</Text>
              </View>
              <View style={styles.scoreInfo}>
                <Text style={styles.scoreTitle}>Safety Score</Text>
                <Text style={styles.scoreDescription}>
                  {stats.safetyScore >= 80 && 'This area is very safe'}
                  {stats.safetyScore >= 60 && stats.safetyScore < 80 && 'This area is relatively safe'}
                  {stats.safetyScore >= 40 && stats.safetyScore < 60 && 'Exercise caution in this area'}
                  {stats.safetyScore < 40 && 'This area has high crime rates'}
                </Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Icon name="people" size={24} color={colors.secondary} />
                <Text style={styles.statValue}>{stats.nearbyUsers}</Text>
                <Text style={styles.statLabel}>Nearby Users</Text>
              </View>

              <View style={styles.statItem}>
                <Icon name="notifications-active" size={24} color={colors.warning} />
                <Text style={styles.statValue}>{stats.recentAlerts}</Text>
                <Text style={styles.statLabel}>Recent Alerts</Text>
              </View>

              <View style={styles.statItem}>
                <Icon name="local-police" size={24} color={colors.error} />
                <Text style={styles.statValue}>{stats.crimeRate.toFixed(1)}</Text>
                <Text style={styles.statLabel}>Crime Rate</Text>
              </View>
            </View>

            <View style={styles.actions}>
              <Pressable style={styles.actionButton} onPress={onViewCrimeHistory}>
                <Icon name="history" size={20} color={colors.primary} />
                <Text style={styles.actionText}>Crime History</Text>
              </Pressable>

              <Pressable style={styles.actionButton} onPress={onPlanSafeRoute}>
                <Icon name="directions" size={20} color={colors.primary} />
                <Text style={styles.actionText}>Safe Route</Text>
              </Pressable>

              <Pressable style={styles.actionButton} onPress={onReportIncident}>
                <Icon name="report" size={20} color={colors.primary} />
                <Text style={styles.actionText}>Report</Text>
              </Pressable>
            </View>

            <Text style={styles.lastUpdated}>
              Last updated: {new Date(stats.lastUpdated).toLocaleTimeString()}
            </Text>
          </>
        ) : (
          <Text style={styles.noData}>Loading area statistics...</Text>
        )}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  scoreValue: {
    fontSize: fontSizes['3xl'],
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  scoreDescription: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  actionButton: {
    alignItems: 'center',
    padding: spacing.md,
  },
  actionText: {
    fontSize: fontSizes.xs,
    color: colors.primary,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  lastUpdated: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  noData: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing['2xl'],
  },
});
