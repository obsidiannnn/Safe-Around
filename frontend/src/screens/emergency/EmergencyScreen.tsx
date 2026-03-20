import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Card, Button, Badge } from '@/components/common';
import { EmergencyTriggerModal } from './EmergencyTriggerModal';
import { useAlertStore } from '@/store/alertStore';
import { useUserStore } from '@/store/userStore';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

/**
 * Emergency dashboard screen
 * Quick access to SOS, contacts, and alert history
 */
export const EmergencyScreen = () => {
  const navigation = useNavigation();
  const { isAlertActive, alertHistory } = useAlertStore();
  const { emergencyContacts } = useUserStore();
  const [showTriggerModal, setShowTriggerModal] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
        <Text style={styles.title}>Emergency</Text>
        <Text style={styles.subtitle}>Quick access to safety features</Text>
      </View>

        {isAlertActive && (
        <Card variant="elevated" padding="lg" style={styles.activeAlertCard}>
          <View style={styles.activeAlertHeader}>
            <Icon name="warning" size={32} color={colors.error} />
            <View style={styles.activeAlertText}>
              <Text style={styles.activeAlertTitle}>Alert Active</Text>
              <Text style={styles.activeAlertDescription}>
                Your emergency contacts are being notified
              </Text>
            </View>
          </View>
          <Button
            variant="primary"
            size="medium"
            fullWidth
            onPress={() => navigation.navigate('EmergencyActive' as never)}
          >
            View Alert Status
          </Button>
        </Card>
      )}

        <Card variant="elevated" padding="lg" style={styles.sosCard}>
        <View style={styles.sosHeader}>
          <Icon name="warning" size={48} color={colors.error} />
          <Text style={styles.sosTitle}>Emergency SOS</Text>
        </View>
        <Text style={styles.sosDescription}>
          Long press to send emergency alert to your contacts and nearby users
        </Text>
        <Button
          variant="danger"
          size="large"
          fullWidth
          icon="warning"
          onPress={() => setShowTriggerModal(true)}
          disabled={isAlertActive}
        >
          Trigger Emergency Alert
        </Button>
      </Card>

        <Card variant="outlined" padding="lg" style={styles.contactsCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Emergency Contacts</Text>
          <Badge variant="count" count={emergencyContacts.length} color="blue" />
        </View>
        <Text style={styles.cardDescription}>
          {emergencyContacts.length > 0
            ? 'Your trusted contacts who will be notified'
            : 'Add emergency contacts to get started'}
        </Text>
        <Button
          variant="outline"
          size="medium"
          fullWidth
          icon="person-add"
          onPress={() => navigation.navigate('EmergencyContacts' as never)}
        >
          {emergencyContacts.length > 0 ? 'Manage Contacts' : 'Add Contacts'}
        </Button>
      </Card>

        <Card variant="outlined" padding="lg" style={styles.historyCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Alert History</Text>
          <Badge variant="count" count={alertHistory.length} color="gray" />
        </View>
        <Text style={styles.cardDescription}>
          View your past emergency alerts and responses
        </Text>
        <Button
          variant="outline"
          size="medium"
          fullWidth
          icon="history"
          onPress={() => navigation.navigate('AlertHistory' as never)}
        >
          View History
        </Button>
      </Card>

        <EmergencyTriggerModal
          visible={showTriggerModal}
          onClose={() => setShowTriggerModal(false)}
        />
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
    fontSize: fontSizes['3xl'],
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  activeAlertCard: {
    marginBottom: spacing.lg,
    backgroundColor: `${colors.error}10`,
    borderWidth: 2,
    borderColor: colors.error,
  },
  activeAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  activeAlertText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  activeAlertTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.error,
  },
  activeAlertDescription: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  sosCard: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  sosHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sosTitle: {
    fontSize: fontSizes['2xl'],
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  sosDescription: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  contactsCard: {
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardDescription: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  historyCard: {
    marginBottom: spacing.lg,
  },
});

