import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Button } from '@/components/common';
import { alertService } from '@/services/api/alertService';
import { useAlertStore } from '@/store/alertStore';
import { AlertDetails } from '@/types/models';
import { colors } from '@/theme/colors';
import { borderRadius, spacing } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';
import { formatDateTime } from '@/utils/formatters';

const RADIUS_STEPS = [
  { radius: 100, offsetSeconds: 0 },
  { radius: 250, offsetSeconds: 30 },
  { radius: 500, offsetSeconds: 60 },
  { radius: 1000, offsetSeconds: 90 },
];

export const EmergencyActiveScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);
  const {
    activeAlert,
    setActiveAlert,
    setCurrentRadius,
    setRespondersCount,
    resolveAlert,
    cancelAlert,
  } = useAlertStore();
  const [details, setDetails] = useState<AlertDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  const resetLocalAlertState = useCallback(() => {
    setActiveAlert(null);
    setCurrentRadius(100);
    setRespondersCount(0);
  }, [setActiveAlert, setCurrentRadius, setRespondersCount]);

  const replaceWithResolution = useCallback((alertId: string) => {
    resetLocalAlertState();
    (navigation as any).replace('EmergencyResolution', { alertId });
  }, [navigation, resetLocalAlertState]);

  const replaceWithDashboard = useCallback(() => {
    resetLocalAlertState();
    (navigation as any).replace('EmergencyDashboard');
  }, [navigation, resetLocalAlertState]);

  useEffect(() => {
    scale.value = withRepeat(withTiming(1.16, { duration: 1100 }), -1, true);
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const loadAlertDetails = useCallback(async (showRefresh = false) => {
    if (!activeAlert?.id) {
      setLoading(false);
      return;
    }

    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const nextDetails = await alertService.getAlertDetails(activeAlert.id);
      setDetails(nextDetails);
      setActiveAlert(nextDetails.alert);
      setCurrentRadius(nextDetails.alert.currentRadius ?? 100);
      setRespondersCount(nextDetails.respondersCount ?? 0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeAlert?.id, setActiveAlert, setCurrentRadius, setRespondersCount]);

  useEffect(() => {
    loadAlertDetails();
  }, [loadAlertDetails]);

  useEffect(() => {
    if (!activeAlert?.id) {
      return;
    }

    const poller = setInterval(() => {
      loadAlertDetails(true);
    }, 5000);

    return () => clearInterval(poller);
  }, [activeAlert?.id, loadAlertDetails]);

  useEffect(() => {
    const sourceDate = details?.alert.createdAt ?? activeAlert?.createdAt;
    if (!sourceDate) {
      setElapsedTime(0);
      return;
    }

    const updateElapsed = () => {
      const diffSeconds = Math.max(
        0,
        Math.floor((Date.now() - new Date(sourceDate).getTime()) / 1000),
      );
      setElapsedTime(diffSeconds);
    };

    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [details?.alert.createdAt, activeAlert?.createdAt]);

  const currentAlert = details?.alert ?? activeAlert;
  const emergencyNumber = details?.emergencyNumber ?? currentAlert?.emergencyNumber ?? '112';
  const respondersCount = details?.respondersCount ?? 0;
  const currentRadius = currentAlert?.currentRadius ?? 100;
  const usersNotified = currentAlert?.usersNotified ?? 0;
  const hasResponder = respondersCount > 0 || currentAlert?.status === 'responding';
  const callButtonLabel = `Call ${emergencyNumber}`;

  const timeline = useMemo(() => {
    return RADIUS_STEPS.map((step, index) => {
      const isReached = currentRadius >= step.radius;
      const nextStep = RADIUS_STEPS[index + 1];
      const timeUntilNext = nextStep
        ? Math.max(0, nextStep.offsetSeconds - elapsedTime)
        : 0;

      let status: 'completed' | 'active' | 'pending' = 'pending';
      if (isReached) {
        status = 'completed';
      } else if (!hasResponder && elapsedTime >= step.offsetSeconds) {
        status = 'active';
      }

      return {
        ...step,
        status,
        helperText: isReached
          ? `${usersNotified} users notified so far`
          : hasResponder
          ? 'Search paused because a responder accepted'
          : nextStep
          ? `Next expansion in ${timeUntilNext}s`
          : `Escalates to ${emergencyNumber} if still unanswered`,
      };
    });
  }, [currentRadius, elapsedTime, emergencyNumber, hasResponder, usersNotified]);

  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSafe = async () => {
    if (!currentAlert) {
      return;
    }

    setIsCompleting(true);
    
    try {
      await resolveAlert(currentAlert.id);
      replaceWithResolution(currentAlert.id);
    } catch (error) {
      // Try to check if alert was already resolved
      try {
        const latestAlert = await alertService.getAlert(currentAlert.id);
        if (latestAlert.status === 'resolved' || latestAlert.status === 'cancelled') {
          replaceWithResolution(currentAlert.id);
          return;
        }
      } catch {
        // If we can't verify, just navigate away - don't trap the user
      }

      // Navigate away regardless of API failure - don't trap user
      replaceWithResolution(currentAlert.id);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleCancel = async () => {
    if (!currentAlert) {
      return;
    }

    setIsCompleting(true);
    
    try {
      await cancelAlert(currentAlert.id);
      replaceWithDashboard();
    } catch (error) {
      // Try to check if alert was already cancelled
      try {
        const latestAlert = await alertService.getAlert(currentAlert.id);
        if (latestAlert.status === 'cancelled' || latestAlert.status === 'resolved') {
          replaceWithDashboard();
          return;
        }
      } catch {
        // If we can't verify, just navigate away - don't trap the user
      }

      // Navigate away regardless of API failure - don't trap user
      replaceWithDashboard();
    } finally {
      setIsCompleting(false);
    }
  };

  const handleCallEmergency = async () => {
    await Linking.openURL(`tel:${emergencyNumber}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.fullScrollView}
        contentContainerStyle={[
          styles.fullScrollContent,
          { paddingBottom: 160 }
        ]}
        showsVerticalScrollIndicator={false}
        bounces={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadAlertDetails(true)}
            tintColor={colors.surface}
          />
        }
      >
        <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.lg) }]}>
          <View style={styles.headerTopRow}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>SOS LIVE</Text>
            </View>
            <Button variant="ghost" size="small" onPress={() => loadAlertDetails(true)} icon="refresh">
              Refresh
            </Button>
          </View>

          <Animated.View style={[styles.heroIcon, animatedStyle]}>
            <Icon name="warning-amber" size={72} color={colors.surface} />
          </Animated.View>
          <Text style={styles.title}>Emergency Alert Active</Text>
          <Text style={styles.subtitle}>
            Live location is being shared and the search radius expands automatically until help is found.
          </Text>
          <Text style={styles.timer}>{formatElapsed(elapsedTime)}</Text>
        </View>

        <View style={styles.contentSection}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Current search radius</Text>
              <Text style={styles.summaryValue}>{currentRadius}m</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Emergency line</Text>
              <Text style={styles.summaryValue}>{emergencyNumber}</Text>
            </View>
          </View>

          <View style={styles.metaCard}>
            <View style={styles.metaRow}>
              <Icon name="place" size={18} color={colors.primary} />
              <Text style={styles.metaText}>
                Started at {currentAlert ? formatDateTime(currentAlert.createdAt) : 'just now'}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Icon name="shield" size={18} color={colors.primary} />
              <Text style={styles.metaText}>
                Status: {currentAlert?.status === 'responding' ? 'Responder on the way' : 'Searching nearby responders'}
              </Text>
            </View>
          </View>

          <View style={styles.timelineCard}>
            <Text style={styles.sectionTitle}>Search expansion</Text>
            {timeline.map((step, index) => (
              <View key={step.radius} style={styles.timelineRow}>
                <View style={styles.timelineRail}>
                  <Icon
                    name={
                      step.status === 'completed'
                        ? 'check-circle'
                        : step.status === 'active'
                        ? 'radio-button-checked'
                        : 'radio-button-unchecked'
                    }
                    size={22}
                    color={
                      step.status === 'completed'
                        ? colors.success
                        : step.status === 'active'
                        ? colors.warning
                        : colors.textSecondary
                    }
                  />
                  {index < timeline.length - 1 && <View style={styles.timelineLine} />}
                </View>

                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>
                    T+{step.offsetSeconds}s: {step.radius}m search
                  </Text>
                  <Text style={styles.timelineDescription}>{step.helperText}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Icon name="groups" size={26} color={colors.secondary} />
              <Text style={styles.statValue}>{respondersCount}</Text>
              <Text style={styles.statLabel}>Responders</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="notifications-active" size={26} color={colors.warning} />
              <Text style={styles.statValue}>{usersNotified}</Text>
              <Text style={styles.statLabel}>Users notified</Text>
            </View>
          </View>

          <View style={styles.calloutCard}>
            <View style={styles.calloutText}>
              <Text style={styles.calloutTitle}>National emergency support</Text>
              <Text style={styles.calloutDescription}>
                If you need direct escalation in India, call {emergencyNumber}. The app will keep expanding the alert radius in parallel.
              </Text>
            </View>
            <Button variant="outline" size="small" onPress={handleCallEmergency} icon="call">
              {callButtonLabel}
            </Button>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <View style={styles.actionRow}>
          <Button
            variant="primary"
            size="medium"
            onPress={handleSafe}
            icon="check-circle"
            style={styles.safeButton}
            disabled={loading || isCompleting || !currentAlert}
          >
            I'm Safe
          </Button>
          <Button
            variant="outline"
            size="medium"
            onPress={handleCancel}
            style={styles.cancelButton}
            disabled={loading || isCompleting || !currentAlert}
          >
            Cancel SOS
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#A51230',
  },
  fullScrollView: {
    flex: 1,
  },
  fullScrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34D399',
    marginRight: spacing.xs,
  },
  liveBadgeText: {
    color: colors.surface,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroIcon: {
    alignSelf: 'center',
    marginTop: spacing.xl,
  },
  title: {
    marginTop: spacing.lg,
    fontSize: fontSizes['3xl'],
    fontWeight: '800',
    color: colors.surface,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: spacing.sm,
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
    lineHeight: 22,
  },
  timer: {
    marginTop: spacing.lg,
    fontSize: fontSizes['4xl'],
    fontWeight: '800',
    color: colors.surface,
    textAlign: 'center',
  },
  contentSection: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.xl,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing['3xl'],
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  summaryItem: {
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: '100%',
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
  },
  summaryValue: {
    marginTop: spacing.xs,
    fontSize: fontSizes['2xl'],
    fontWeight: '800',
    color: colors.textPrimary,
  },
  metaCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  metaText: {
    marginLeft: spacing.sm,
    flex: 1,
    color: colors.textPrimary,
  },
  timelineCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineRail: {
    alignItems: 'center',
    width: 28,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: spacing.lg,
    paddingLeft: spacing.sm,
  },
  timelineTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  timelineDescription: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statValue: {
    marginTop: spacing.sm,
    fontSize: fontSizes['3xl'],
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statLabel: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
  },
  calloutCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  calloutText: {
    marginBottom: spacing.md,
  },
  calloutTitle: {
    fontSize: fontSizes.md,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  calloutDescription: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  safeButton: {
    backgroundColor: colors.success,
    flex: 1,
    minHeight: 52,
  },
  cancelButton: {
    flex: 1,
    minHeight: 52,
  },
});
