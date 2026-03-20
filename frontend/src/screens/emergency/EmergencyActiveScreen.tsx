import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { Button } from '@/components/common';
import { AlertTimeline } from '@/components/emergency/AlertTimeline';
import { useAlertStore } from '@/store/alertStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useRealtimeLocation } from '@/hooks/useRealtimeLocation';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

interface RadiusExpansion {
  radius: number;
  time: number;
  status: 'completed' | 'in-progress' | 'pending';
  usersNotified: number;
}

/**
 * Emergency active screen showing alert status and responders
 * Real-time updates via WebSocket
 */
export const EmergencyActiveScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { activeAlert, currentRadius, respondersCount, resolveAlert, cancelAlert } = useAlertStore();
  const { subscribe, unsubscribe } = useWebSocket();
  const { isStreaming } = useRealtimeLocation(activeAlert?.id || null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [expansions, setExpansions] = useState<RadiusExpansion[]>([
    { radius: 100, time: 0, status: 'completed', usersNotified: 8 },
    { radius: 250, time: 30, status: 'in-progress', usersNotified: 0 },
    { radius: 500, time: 60, status: 'pending', usersNotified: 0 },
    { radius: 1000, time: 90, status: 'pending', usersNotified: 0 },
  ]);

  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.2, { duration: 1000 }),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Listen for WebSocket updates
    const handleResponder = (data: any) => {
      console.log('New responder:', data);
    };

    const handleRadiusExpanded = (data: any) => {
      console.log('Radius expanded:', data);
      setExpansions((prev) =>
        prev.map((exp) =>
          exp.radius === data.new_radius
            ? { ...exp, status: 'completed', usersNotified: data.users_notified }
            : exp
        )
      );
    };

    subscribe('responder_accepted', handleResponder);
    subscribe('radius_expanded', handleRadiusExpanded);

    return () => {
      unsubscribe('responder_accepted', handleResponder);
      unsubscribe('radius_expanded', handleRadiusExpanded);
    };
  }, [subscribe, unsubscribe]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSafe = async () => {
    if (activeAlert) {
      try {
        await resolveAlert(activeAlert.id);
        navigation.navigate('EmergencyResolution' as never);
      } catch (error) {
        console.error('Error resolving alert:', error);
      }
    }
  };

  const handleCancel = async () => {
    if (activeAlert) {
      try {
        await cancelAlert(activeAlert.id);
        navigation.goBack();
      } catch (error) {
        console.error('Error cancelling alert:', error);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Animated.View style={animatedStyle}>
          <Icon name="warning" size={80} color={colors.surface} />
        </Animated.View>
        <Text style={styles.title}>EMERGENCY ALERT ACTIVE</Text>
        <Text style={styles.timer}>{formatTime(elapsedTime)}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.radiusCard}>
          <Text style={styles.radiusTitle}>Notifying users within</Text>
          <Text style={styles.radiusValue}>{currentRadius}m</Text>
        </View>

        <View style={styles.timeline}>
          {expansions.map((expansion, index) => (
            <View key={index} style={styles.timelineItem}>
              <View style={styles.timelineIconContainer}>
                <Icon
                  name={
                    expansion.status === 'completed'
                      ? 'check-circle'
                      : expansion.status === 'in-progress'
                      ? 'radio-button-checked'
                      : 'radio-button-unchecked'
                  }
                  size={24}
                  color={
                    expansion.status === 'completed'
                      ? colors.success
                      : expansion.status === 'in-progress'
                      ? colors.warning
                      : colors.textSecondary
                  }
                />
                {index < expansions.length - 1 && <View style={styles.timelineLine} />}
              </View>

              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>
                  T+{expansion.time}s: {expansion.radius}m radius
                </Text>
                {expansion.status === 'completed' && (
                  <Text style={styles.timelineDescription}>
                    {expansion.usersNotified} users notified
                  </Text>
                )}
                {expansion.status === 'in-progress' && (
                  <Text style={styles.timelineDescription}>Expanding...</Text>
                )}
                {expansion.radius === 1000 && expansion.status === 'pending' && (
                  <Text style={styles.timelineDescription}>+ 911 call</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Icon name="people" size={32} color={colors.secondary} />
            <Text style={styles.statValue}>{respondersCount}</Text>
            <Text style={styles.statLabel}>Responders</Text>
          </View>

          <View style={styles.statCard}>
            <Icon name="notifications-active" size={32} color={colors.warning} />
            <Text style={styles.statValue}>
              {expansions.find((e) => e.status === 'completed')?.usersNotified || 0}
            </Text>
            <Text style={styles.statLabel}>Notified</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <Button
          variant="primary"
          size="large"
          fullWidth
          onPress={handleSafe}
          icon="check-circle"
          style={[styles.actionButton, { backgroundColor: colors.success }]}
        >
          I'm Safe Now
        </Button>

        <Button
          variant="outline"
          size="medium"
          fullWidth
          onPress={handleCancel}
        >
          Cancel Alert
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.error,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing['2xl'],
    paddingBottom: spacing['3xl'],
  },
  title: {
    fontSize: fontSizes['2xl'],
    fontWeight: '700',
    color: colors.surface,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
  timer: {
    fontSize: fontSizes['4xl'],
    fontWeight: '700',
    color: colors.surface,
    marginTop: spacing.md,
  },
  content: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: spacing['2xl'],
    borderTopRightRadius: spacing['2xl'],
    padding: spacing['2xl'],
    paddingBottom: spacing['3xl'],
  },
  radiusCard: {
    backgroundColor: colors.background,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  radiusTitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  radiusValue: {
    fontSize: fontSizes['4xl'],
    fontWeight: '700',
    color: colors.primary,
  },
  timeline: {
    marginBottom: spacing['2xl'],
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  timelineIconContainer: {
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: spacing.xs,
  },
  timelineContent: {
    flex: 1,
    paddingTop: spacing.xs,
  },
  timelineTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timelineDescription: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.xl,
  },
  statCard: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  statValue: {
    fontSize: fontSizes['2xl'],
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  actions: {
    padding: spacing['2xl'],
    gap: spacing.md,
  },
  actionButton: {
    marginBottom: spacing.md,
  },
  disclaimer: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
