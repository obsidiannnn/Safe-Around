import React, { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Card, Avatar, Button } from '@/components/common';
import { alertService } from '@/services/api/alertService';
import { useAlertStore } from '@/store/alertStore';
import { AlertDetails, AlertResponderSummary } from '@/types/models';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

const formatDistance = (distanceMeters: number) => {
  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(1)} km away`;
  }
  return `${Math.round(distanceMeters)}m away`;
};

const formatEta = (etaSeconds: number) => {
  return `${Math.max(1, Math.round(etaSeconds / 60))} min ETA`;
};

export const ResponderListScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const activeAlert = useAlertStore((state) => state.activeAlert);
  const alertId = route.params?.alertId ?? activeAlert?.id;
  const [details, setDetails] = useState<AlertDetails | null>(null);

  const loadDetails = useCallback(async () => {
    if (!alertId) {
      return;
    }

    try {
      const nextDetails = await alertService.getAlertDetails(alertId);
      setDetails(nextDetails);
    } catch (error) {
      console.warn('Failed to load responder list:', error);
    }
  }, [alertId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  useEffect(() => {
    if (!alertId) {
      return;
    }

    const poller = setInterval(loadDetails, 5000);
    return () => clearInterval(poller);
  }, [alertId, loadDetails]);

  const responders = details?.responders ?? [];

  const handleCall = async (responder: AlertResponderSummary) => {
    if (!responder.phone) {
      return;
    }
    await Linking.openURL(`tel:${responder.phone}`);
  };

  const handleMessage = (responderId: string) => {
    (navigation as any).navigate('Chat', { responderId });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Responders</Text>
          <Text style={styles.subtitle}>{responders.length} people on their way</Text>
        </View>

        {responders.map((responder) => (
          <Card key={responder.userId} variant="elevated" padding="lg" style={styles.responderCard}>
            <View style={styles.responderHeader}>
              <Avatar name={responder.name} size="large" showStatus isOnline />
              <View style={styles.responderInfo}>
                <Text style={styles.responderName}>{responder.name}</Text>
                <View style={styles.responderStats}>
                  <View style={styles.stat}>
                    <Icon name="location-on" size={16} color={colors.textSecondary} />
                    <Text style={styles.statText}>{formatDistance(responder.distanceMeters)}</Text>
                  </View>
                  <View style={styles.stat}>
                    <Icon name="schedule" size={16} color={colors.textSecondary} />
                    <Text style={styles.statText}>{formatEta(responder.etaSeconds)}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.statusBanner}>
              <Text style={styles.statusText}>
                Status: {responder.responseStatus === 'accepted' ? 'On the way' : responder.responseStatus}
              </Text>
            </View>

            <View style={styles.responderActions}>
              <Button
                variant="primary"
                size="medium"
                icon="phone"
                onPress={() => handleCall(responder)}
                disabled={!responder.phone}
                style={styles.responderButton}
              >
                Call
              </Button>
              <Button
                variant="outline"
                size="medium"
                icon="message"
                onPress={() => handleMessage(responder.userId)}
                style={styles.responderButton}
              >
                Message
              </Button>
            </View>
          </Card>
        ))}

        {responders.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="people-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No responders yet</Text>
            <Text style={styles.emptyDescription}>
              Nearby users are still being notified of your emergency.
            </Text>
          </View>
        )}
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
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSizes['2xl'],
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  responderCard: {
    marginBottom: spacing.lg,
  },
  responderHeader: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  responderInfo: {
    marginLeft: spacing.lg,
    flex: 1,
  },
  responderName: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  responderStats: {
    gap: spacing.sm,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  statusBanner: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  statusText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  responderActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  responderButton: {
    flex: 1,
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
