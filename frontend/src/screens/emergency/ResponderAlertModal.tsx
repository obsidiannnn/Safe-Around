import React, { useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Modal, Button, BottomSheet } from '@/components/common';
import { Alert } from '@/types/models';
import { useAlertStore } from '@/store/alertStore';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';
import { formatTimeAgo } from '@/utils/formatters';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ResponderAlertModalProps {
  visible: boolean;
  onClose: () => void;
  alert: Alert;
  distance: number;
}

/**
 * Modal shown when nearby emergency alert is received
 * Allows accepting or declining response
 */
export const ResponderAlertModal: React.FC<ResponderAlertModalProps> = ({
  visible,
  onClose,
  alert,
  distance,
}) => {
  const navigation = useNavigation();
  const { respondToAlert } = useAlertStore();
  const [showDeclineReasons, setShowDeclineReasons] = useState(false);
  const [isResponding, setIsResponding] = useState(false);

  const declineReasons = [
    { id: 'too-far', label: 'Too far away', icon: 'location-off' },
    { id: 'not-safe', label: 'Not safe for me', icon: 'block' },
    { id: 'busy', label: 'Currently busy', icon: 'schedule' },
    { id: 'other', label: 'Other reason', icon: 'more-horiz' },
  ];

  const handleRespond = async () => {
    try {
      setIsResponding(true);
      await respondToAlert(alert.id);
      onClose();
      navigation.navigate('ResponderNavigation' as never, { alertId: alert.id });
    } catch (error) {
      console.error('Error responding to alert:', error);
      alert('Failed to respond to alert');
    } finally {
      setIsResponding(false);
    }
  };

  const handleDecline = (reasonId: string) => {
    // TODO: Submit decline reason for analytics
    console.log('Declined with reason:', reasonId);
    setShowDeclineReasons(false);
    onClose();
  };

  return (
    <>
      <Modal visible={visible} onClose={onClose} dismissOnBackdrop={false}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Icon name="warning" size={48} color={colors.error} />
            <Text style={styles.title}>Emergency Alert Nearby</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Icon name="location-on" size={20} color={colors.textSecondary} />
              <Text style={styles.infoText}>{distance}m away</Text>
            </View>

            <View style={styles.infoRow}>
              <Icon name="schedule" size={20} color={colors.textSecondary} />
              <Text style={styles.infoText}>{formatTimeAgo(alert.createdAt)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Icon name="people" size={20} color={colors.textSecondary} />
              <Text style={styles.infoText}>2 others responding</Text>
            </View>
          </View>

          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={{
                latitude: alert.location.latitude,
                longitude: alert.location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Marker
                coordinate={{
                  latitude: alert.location.latitude,
                  longitude: alert.location.longitude,
                }}
              >
                <View style={styles.alertMarker}>
                  <Icon name="warning" size={24} color={colors.surface} />
                </View>
              </Marker>
            </MapView>
          </View>

          <View style={styles.disclaimer}>
            <Icon name="info" size={16} color={colors.warning} />
            <Text style={styles.disclaimerText}>
              Only respond if it's safe for you to do so
            </Text>
          </View>

          <View style={styles.actions}>
            <Button
              variant="primary"
              size="large"
              fullWidth
              onPress={handleRespond}
              loading={isResponding}
              icon="directions-run"
              style={[styles.actionButton, { backgroundColor: colors.success }]}
            >
              I'm On My Way
            </Button>

            <Button
              variant="outline"
              size="medium"
              fullWidth
              onPress={() => setShowDeclineReasons(true)}
            >
              Decline
            </Button>
          </View>
        </View>
      </Modal>

      <BottomSheet
        visible={showDeclineReasons}
        onClose={() => setShowDeclineReasons(false)}
      >
        <View style={styles.reasonsContainer}>
          <Text style={styles.reasonsTitle}>Why can't you respond?</Text>
          {declineReasons.map((reason) => (
            <Button
              key={reason.id}
              variant="outline"
              size="large"
              fullWidth
              icon={reason.icon}
              onPress={() => handleDecline(reason.id)}
              style={styles.reasonButton}
            >
              {reason.label}
            </Button>
          ))}
        </View>
      </BottomSheet>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSizes['2xl'],
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: colors.background,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    marginLeft: spacing.md,
  },
  mapContainer: {
    height: 200,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  map: {
    flex: 1,
  },
  alertMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: `${colors.warning}20`,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  disclaimerText: {
    fontSize: fontSizes.sm,
    color: colors.warning,
    marginLeft: spacing.sm,
    fontWeight: '600',
  },
  actions: {
    gap: spacing.md,
  },
  actionButton: {
    marginBottom: spacing.sm,
  },
  reasonsContainer: {
    paddingVertical: spacing.lg,
  },
  reasonsTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  reasonButton: {
    marginBottom: spacing.md,
  },
});
