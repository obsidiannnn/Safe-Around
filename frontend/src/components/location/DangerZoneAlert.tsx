import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Vibration } from 'react-native';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { DangerZone } from '@/types/models';
import { theme } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface DangerZoneAlertProps {
  visible: boolean;
  zone: DangerZone;
  onDismiss: () => void;
  onEnableSafeRoute: () => void;
  onAlertContacts: () => void;
}

export const DangerZoneAlert: React.FC<DangerZoneAlertProps> = ({
  visible,
  zone,
  onDismiss,
  onEnableSafeRoute,
  onAlertContacts,
}) => {
  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Vibration.vibrate([0, 200, 100, 200]);
    }
  }, [visible]);

  const safetyTips = [
    'Stay in well-lit areas',
    'Be aware of surroundings',
    'Keep phone accessible',
  ];

  return (
    <Modal visible={visible} onClose={onDismiss}>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons name="warning" size={64} color={theme.colors.warning} />
        </View>

        <Text style={styles.title}>You are not in safe zone please get out of here</Text>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Safety Score</Text>
            <Text style={styles.statValue}>{zone.safetyScore}/100</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Incidents (30 days)</Text>
            <Text style={styles.statValue}>{zone.crimeCount}</Text>
          </View>
        </View>

        <View style={styles.crimeType}>
          <Text style={styles.crimeLabel}>Most Common:</Text>
          <Text style={styles.crimeValue}>{zone.mostCommonCrimeType}</Text>
        </View>

        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Safety Tips:</Text>
          {safetyTips.map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Button
            variant="outline"
            onPress={onDismiss}
            style={styles.actionButton}
          >
            Dismiss
          </Button>
          <Button
            variant="secondary"
            onPress={onEnableSafeRoute}
            style={styles.actionButton}
          >
            Safe Route
          </Button>
          <Button
            variant="danger"
            onPress={onAlertContacts}
            style={styles.actionButton}
          >
            Alert Contacts
          </Button>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  statValue: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.warning,
  },
  crimeType: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  crimeLabel: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.xs,
  },
  crimeValue: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  tipsContainer: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  tipsTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  tipText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  actions: {
    gap: theme.spacing.sm,
  },
  actionButton: {
    marginBottom: theme.spacing.xs,
  },
});
