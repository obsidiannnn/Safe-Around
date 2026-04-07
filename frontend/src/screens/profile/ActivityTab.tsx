import React, { useEffect } from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAlertStore } from '@/store/alertStore';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';

export const ActivityTab = () => {
  const { alertHistory, fetchHistory } = useAlertStore();

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Activity History</Text>
      {alertHistory.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="time-outline" size={28} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No recent activity found</Text>
          <Text style={styles.emptyText}>SOS alerts and resolved incidents will appear here.</Text>
        </View>
      ) : (
        alertHistory.map((alert) => (
          <View key={alert.id} style={styles.activityCard}>
            <View style={styles.iconBox}>
              <Ionicons name={alert.status === 'resolved' ? 'checkmark-circle-outline' : 'warning-outline'} size={22} color={alert.status === 'resolved' ? colors.success : colors.warning} />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>{alert.type.replace('_', ' ').toUpperCase()} Alert</Text>
              <Text style={styles.activityMeta}>
                {alert.status.toUpperCase()} - {new Date(alert.createdAt).toLocaleString()}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    marginRight: spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  activityMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
