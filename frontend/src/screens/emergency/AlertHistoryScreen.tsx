import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { Card, Badge } from '@/components/common';
import { useAlertStore } from '@/store/alertStore';
import { Alert } from '@/types/models';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';
import { formatDateTime, formatTimeAgo } from '@/utils/formatters';

type FilterPeriod = '7days' | '30days' | 'all';

/**
 * Alert history screen showing past emergency alerts
 * Supports filtering and exporting to PDF
 */
export const AlertHistoryScreen = () => {
  const navigation = useNavigation();
  const { alertHistory, fetchHistory, isHistoryLoading, historyLoadedAt } = useAlertStore();
  const [filter, setFilter] = useState<FilterPeriod>('30days');

  useEffect(() => {
    void fetchHistory(true);
  }, [fetchHistory]);

  const getStatusColor = (status: string): 'green' | 'red' | 'gray' => {
    switch (status) {
      case 'resolved':
        return 'green';
      case 'cancelled':
        return 'gray';
      default:
        return 'red';
    }
  };

  const getStatusLabel = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const calculateDuration = (alert: Alert): string => {
    const endTimestamp = alert.resolvedAt ?? alert.cancelledAt;
    if (!endTimestamp) return 'Ongoing';
    const start = new Date(alert.createdAt).getTime();
    const end = new Date(endTimestamp).getTime();
    const duration = Math.floor((end - start) / 1000);
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredAlerts = useMemo(() => {
    if (filter === 'all') {
      return alertHistory;
    }

    const now = Date.now();
    const days = filter === '7days' ? 7 : 30;
    const threshold = now - days * 24 * 60 * 60 * 1000;

    return alertHistory.filter((alert) => {
      const createdAt = new Date(alert.createdAt).getTime();
      return !Number.isNaN(createdAt) && createdAt >= threshold;
    });
  }, [alertHistory, filter]);

  const activeCount = filteredAlerts.filter((alert) => ['active', 'responding'].includes(alert.status)).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Alert History</Text>
          <Text style={styles.subtitle}>
            {filteredAlerts.length} alerts recorded, {activeCount} currently active
          </Text>
        </View>
      </View>

      <View style={styles.filters}>
        <Pressable
          style={[styles.filterButton, filter === '7days' && styles.activeFilter]}
          onPress={() => setFilter('7days')}
        >
          <Text style={[styles.filterText, filter === '7days' && styles.activeFilterText]}>
            Last 7 Days
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterButton, filter === '30days' && styles.activeFilter]}
          onPress={() => setFilter('30days')}
        >
          <Text style={[styles.filterText, filter === '30days' && styles.activeFilterText]}>
            Last 30 Days
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
            All Time
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isHistoryLoading && !historyLoadedAt ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Loading your alert history...</Text>
          </View>
        ) : null}

        {filteredAlerts.map((alert) => (
          <Card
            key={alert.id}
            variant="outlined"
            padding="lg"
            style={styles.alertCard}
            onPress={() => (navigation as any).navigate('AlertDetail', { alertId: alert.id })}
          >
            <View style={styles.alertHeader}>
              <View style={styles.alertInfo}>
                <Text style={styles.alertDate}>{formatDateTime(alert.createdAt)}</Text>
                <Text style={styles.alertTime}>{formatTimeAgo(alert.createdAt)}</Text>
              </View>
              <Badge
                variant="status"
                color={getStatusColor(alert.status)}
                label={getStatusLabel(alert.status)}
              />
            </View>

            <View style={styles.alertDetails}>
              <View style={styles.detailItem}>
                <Icon name="location-on" size={16} color={colors.textSecondary} />
                <Text style={styles.detailText}>
                  {alert.location.latitude.toFixed(4)}, {alert.location.longitude.toFixed(4)}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Icon name="schedule" size={16} color={colors.textSecondary} />
                <Text style={styles.detailText}>Duration: {calculateDuration(alert)}</Text>
              </View>

              <View style={styles.detailItem}>
                <Icon name="warning-amber" size={16} color={colors.textSecondary} />
                <Text style={styles.detailText}>
                  {alert.type === 'panic' ? 'Emergency SOS' : alert.type.replace('_', ' ')}
                </Text>
              </View>
            </View>
          </Card>
        ))}

        {filteredAlerts.length === 0 && !isHistoryLoading && (
          <View style={styles.emptyState}>
            <Icon name="history" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No alert history</Text>
            <Text style={styles.emptyDescription}>
              Your emergency alerts will appear here
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: fontSizes['2xl'],
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  filters: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  filterButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  activeFilter: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: fontSizes.xs,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  activeFilterText: {
    color: colors.surface,
  },
  content: {
    padding: spacing.lg,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['4xl'],
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  alertCard: {
    marginBottom: spacing.md,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  alertInfo: {
    flex: 1,
  },
  alertDate: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  alertTime: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  alertDetails: {
    gap: spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['5xl'],
  },
  emptyText: {
    fontSize: fontSizes.xl,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  emptyDescription: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
