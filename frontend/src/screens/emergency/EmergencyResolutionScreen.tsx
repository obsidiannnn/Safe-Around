import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { Button, Card, Input, Avatar } from '@/components/common';
import { alertService } from '@/services/api/alertService';
import { useAlertStore } from '@/store/alertStore';
import { AlertDetails } from '@/types/models';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';
import { formatDateTime } from '@/utils/formatters';

const formatDuration = (durationSeconds: number) => {
  const safeSeconds = Math.max(0, durationSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const formatDistance = (distanceMeters: number) => {
  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(distanceMeters)} m`;
};

const formatEta = (etaSeconds: number) => {
  const minutes = Math.max(1, Math.round(etaSeconds / 60));
  return `${minutes} min ETA`;
};

export const EmergencyResolutionScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const alertHistory = useAlertStore((state) => state.alertHistory);
  const fallbackAlertId = alertHistory.find((alert) => alert.status === 'resolved')?.id;
  const alertId = route.params?.alertId ?? fallbackAlertId;

  const [details, setDetails] = useState<AlertDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [wasHelpful, setWasHelpful] = useState<boolean | null>(null);

  const loadDetails = useCallback(async () => {
    if (!alertId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const nextDetails = await alertService.getAlertDetails(alertId);
      setDetails(nextDetails);
    } catch (error) {
      console.warn('Failed to load resolved alert details:', error);
    } finally {
      setLoading(false);
    }
  }, [alertId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const reportText = useMemo(() => {
    if (!details) {
      return '';
    }

    const lines = [
      'SafeAround Incident Report',
      `Alert ID: ${details.incidentReport.alertId}`,
      `Status: ${details.incidentReport.status}`,
      `Started: ${formatDateTime(details.incidentReport.createdAt)}`,
      `Ended: ${formatDateTime(details.incidentReport.endedAt)}`,
      `Duration: ${formatDuration(details.durationSeconds)}`,
      `Max search radius: ${details.incidentReport.maxRadiusReached}m`,
      `Users notified: ${details.incidentReport.usersNotified}`,
      `Responders: ${details.respondersCount}`,
      `Emergency services: ${details.emergencyServicesStatus}`,
    ];

    if (details.responders.length > 0) {
      lines.push('', 'Responders');
      details.responders.forEach((responder, index) => {
        lines.push(
          `${index + 1}. ${responder.name} | ${formatDistance(responder.distanceMeters)} | ${formatEta(responder.etaSeconds)} | ${responder.responseStatus}`,
        );
      });
    }

    return lines.join('\n');
  }, [details]);

  const handleSubmitRating = () => {
    console.log('Rating submitted:', { rating, feedback, wasHelpful, alertId });
    navigation.navigate('EmergencyDashboard' as never);
  };

  const handleShareReport = async () => {
    if (!reportText) {
      return;
    }

    try {
      await Share.share({
        title: 'SafeAround Incident Report',
        message: reportText,
      });
    } catch (error) {
      Alert.alert('Report unavailable', 'We could not prepare the incident report right now.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.centeredState}>
          <Text style={styles.loadingText}>Loading incident summary...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!details) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.centeredState}>
          <Text style={styles.loadingText}>We could not load this alert summary.</Text>
          <Button variant="outline" onPress={() => navigation.goBack()}>
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Icon name="check-circle" size={80} color={colors.success} />
          </View>
          <Text style={styles.title}>You're Safe!</Text>
          <Text style={styles.subtitle}>Emergency alert has been resolved</Text>
        </View>

        <Card variant="elevated" padding="lg" style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Alert Summary</Text>

          <View style={styles.summaryRow}>
            <Icon name="schedule" size={20} color={colors.textSecondary} />
            <Text style={styles.summaryLabel}>Duration</Text>
            <Text style={styles.summaryValue}>{formatDuration(details.durationSeconds)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Icon name="people" size={20} color={colors.textSecondary} />
            <Text style={styles.summaryLabel}>Responders</Text>
            <Text style={styles.summaryValue}>{details.respondersCount}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Icon name="local-police" size={20} color={colors.textSecondary} />
            <Text style={styles.summaryLabel}>Emergency Services</Text>
            <Text style={styles.summaryValue}>{details.emergencyServicesStatus}</Text>
          </View>
        </Card>

        {details.responders.length > 0 && (
          <Card variant="elevated" padding="lg" style={styles.respondersCard}>
            <Text style={styles.cardTitle}>Responders Who Helped</Text>
            {details.responders.map((responder) => (
              <View key={responder.userId} style={styles.responderItem}>
                <Avatar name={responder.name} size="medium" />
                <View style={styles.responderInfo}>
                  <Text style={styles.responderName}>{responder.name}</Text>
                  <Text style={styles.responderMeta}>
                    {formatDistance(responder.distanceMeters)} • {formatEta(responder.etaSeconds)}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        <Card variant="elevated" padding="lg" style={styles.ratingCard}>
          <Text style={styles.cardTitle}>Rate Your Experience</Text>

          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Icon
                key={star}
                name={star <= rating ? 'star' : 'star-border'}
                size={40}
                color={star <= rating ? '#FDD835' : colors.border}
                onPress={() => setRating(star)}
              />
            ))}
          </View>

          <Input
            value={feedback}
            onChangeText={setFeedback}
            placeholder="Share your feedback (optional)"
            maxLength={500}
            showCounter
          />

          <Text style={styles.helpfulQuestion}>Was the response helpful?</Text>
          <View style={styles.helpfulButtons}>
            <Button
              variant={wasHelpful === true ? 'primary' : 'outline'}
              size="medium"
              onPress={() => setWasHelpful(true)}
              style={styles.helpfulButton}
            >
              Yes
            </Button>
            <Button
              variant={wasHelpful === false ? 'primary' : 'outline'}
              size="medium"
              onPress={() => setWasHelpful(false)}
              style={styles.helpfulButton}
            >
              No
            </Button>
          </View>
        </Card>

        <View style={styles.actions}>
          <Button
            variant="outline"
            size="large"
            fullWidth
            icon="description"
            onPress={handleShareReport}
            style={styles.actionButton}
          >
            Download Incident Report
          </Button>

          <Button
            variant="primary"
            size="large"
            fullWidth
            onPress={handleSubmitRating}
            disabled={rating === 0}
          >
            Submit & Close
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing['2xl'],
    paddingBottom: spacing['4xl'],
  },
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  loadingText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing['2xl'],
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSizes['3xl'],
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  summaryCard: {
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryLabel: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginLeft: spacing.md,
  },
  summaryValue: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  respondersCard: {
    marginBottom: spacing.lg,
  },
  responderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  responderInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  responderName: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  responderMeta: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
  },
  ratingCard: {
    marginBottom: spacing.lg,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  helpfulQuestion: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  helpfulButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  helpfulButton: {
    flex: 1,
  },
  actions: {
    gap: spacing.md,
  },
  actionButton: {
    marginBottom: spacing.sm,
  },
});
