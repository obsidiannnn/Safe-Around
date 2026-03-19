import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Card, Avatar, Button } from '@/components/common';
import { useWebSocket } from '@/hooks/useWebSocket';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

interface Responder {
  id: string;
  name: string;
  avatar?: string;
  distance: number;
  eta: number;
  location: {
    latitude: number;
    longitude: number;
  };
}

/**
 * List of responders heading to emergency location
 * Real-time updates of distance and ETA
 */
export const ResponderListScreen = () => {
  const { on, off } = useWebSocket();
  const [responders, setResponders] = useState<Responder[]>([
    {
      id: '1',
      name: 'Sarah K.',
      distance: 150,
      eta: 2,
      location: { latitude: 37.78825, longitude: -122.4324 },
    },
    {
      id: '2',
      name: 'Mike T.',
      distance: 320,
      eta: 4,
      location: { latitude: 37.78925, longitude: -122.4334 },
    },
  ]);

  useEffect(() => {
    on('responder:location-update', (data) => {
      setResponders((prev) =>
        prev.map((r) => (r.id === data.responderId ? { ...r, ...data } : r))
      );
    });

    return () => {
      off('responder:location-update');
    };
  }, []);

  const handleCall = (responderId: string) => {
    // TODO: Initiate Twilio VOIP call
    console.log('Calling responder:', responderId);
  };

  const handleMessage = (responderId: string) => {
    // TODO: Open chat
    console.log('Messaging responder:', responderId);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Responders</Text>
        <Text style={styles.subtitle}>{responders.length} people on their way</Text>
      </View>

      {responders.map((responder) => (
        <Card key={responder.id} variant="elevated" padding="lg" style={styles.responderCard}>
          <View style={styles.responderHeader}>
            <Avatar name={responder.name} size="large" showStatus isOnline />
            <View style={styles.responderInfo}>
              <Text style={styles.responderName}>{responder.name}</Text>
              <View style={styles.responderStats}>
                <View style={styles.stat}>
                  <Icon name="location-on" size={16} color={colors.textSecondary} />
                  <Text style={styles.statText}>{responder.distance}m away</Text>
                </View>
                <View style={styles.stat}>
                  <Icon name="schedule" size={16} color={colors.textSecondary} />
                  <Text style={styles.statText}>{responder.eta} min ETA</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.miniMap}>
            <Text style={styles.miniMapPlaceholder}>Mini map showing live location</Text>
          </View>

          <View style={styles.responderActions}>
            <Button
              variant="primary"
              size="medium"
              icon="phone"
              onPress={() => handleCall(responder.id)}
              style={styles.responderButton}
            >
              Call
            </Button>
            <Button
              variant="outline"
              size="medium"
              icon="message"
              onPress={() => handleMessage(responder.id)}
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
            Nearby users are being notified of your emergency
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
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
  miniMap: {
    height: 120,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  miniMapPlaceholder: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
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
