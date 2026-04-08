import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { Badge, Button } from '@/components/common';
import { alertService } from '@/services/api/alertService';
import { Alert } from '@/types/models';
import { colors } from '@/theme/colors';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';
import { formatDateTime, formatTimeAgo } from '@/utils/formatters';

export const AlertDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const [alert, setAlert] = useState<Alert | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAlert = async () => {
      try {
        const alertId = route.params?.alertId;
        if (!alertId) {
          return;
        }
        const data = await alertService.getAlert(alertId);
        setAlert(data);
      } finally {
        setLoading(false);
      }
    };

    loadAlert();
  }, [route.params?.alertId]);

  const getStatusColor = (status?: string): 'green' | 'red' | 'gray' => {
    switch (status) {
      case 'resolved':
        return 'green';
      case 'cancelled':
        return 'gray';
      default:
        return 'red';
    }
  };

  const getStatusLabel = (status?: string) =>
    status ? `${status.charAt(0).toUpperCase()}${status.slice(1)}` : 'Unknown';

  const formatCoordinate = (value?: number, positive?: string, negative?: string) => {
    if (typeof value !== 'number') {
      return 'Unavailable';
    }
    return `${Math.abs(value).toFixed(4)}° ${value >= 0 ? positive : negative}`;
  };

  const handleOpenLiveStatus = () => {
    const parentNavigation = navigation.getParent();
    if (parentNavigation) {
      (parentNavigation as any).navigate('Emergency', { screen: 'EmergencyActive' });
      return;
    }

    (navigation as any).navigate('EmergencyActive');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Button variant="ghost" size="small" onPress={() => navigation.goBack()} icon="arrow-back">
          Back
        </Button>
        <Text style={styles.headerTitle}>Alert Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading alert details...</Text>
        </View>
      ) : !alert ? (
        <View style={styles.emptyState}>
          <Icon name="error-outline" size={40} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Alert not available</Text>
          <Text style={styles.emptyText}>We could not load this alert right now.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View>
                <Text style={styles.heroLabel}>Emergency event</Text>
                <Text style={styles.heroTitle}>
                  {alert.type === 'panic' ? 'Emergency SOS' : alert.type.replace('_', ' ')}
                </Text>
              </View>
              <Badge
                variant="status"
                color={getStatusColor(alert.status)}
                label={getStatusLabel(alert.status)}
              />
            </View>
            <Text style={styles.heroDescription}>
              Logged {formatTimeAgo(alert.createdAt)} and tracked in your personal emergency history.
            </Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Timeline</Text>
            <View style={styles.row}>
              <Icon name="schedule" size={18} color={colors.primary} />
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Triggered</Text>
                <Text style={styles.rowValue}>{formatDateTime(alert.createdAt)}</Text>
              </View>
            </View>
            <View style={styles.row}>
              <Icon name="check-circle-outline" size={18} color={colors.primary} />
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Resolved</Text>
                <Text style={styles.rowValue}>
                  {alert.resolvedAt ? formatDateTime(alert.resolvedAt) : 'Still active or cancelled'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.row}>
              <Icon name="place" size={18} color={colors.primary} />
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Pinned coordinates</Text>
                <Text style={styles.rowValue}>
                  {formatCoordinate(alert.location.latitude, 'N', 'S')},{' '}
                  {formatCoordinate(alert.location.longitude, 'E', 'W')}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Alert payload</Text>
            <View style={styles.row}>
              <Icon name="sms" size={18} color={colors.primary} />
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Message</Text>
                <Text style={styles.rowValue}>
                  {alert.message || 'Emergency alert triggered with live location attached.'}
                </Text>
              </View>
            </View>
          </View>

          {alert.status === 'active' && (
            <Button
              fullWidth
              size="large"
              variant="danger"
              icon="warning"
              onPress={handleOpenLiveStatus}
            >
              Open Active Alert
            </Button>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 56,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    marginTop: spacing.md,
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyText: {
    marginTop: spacing.sm,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.small,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  heroLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroTitle: {
    marginTop: spacing.xs,
    fontSize: fontSizes['2xl'],
    fontWeight: '800',
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  heroDescription: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    lineHeight: 21,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.small,
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  rowText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  rowLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  rowValue: {
    marginTop: spacing.xs,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    lineHeight: 22,
  },
});
