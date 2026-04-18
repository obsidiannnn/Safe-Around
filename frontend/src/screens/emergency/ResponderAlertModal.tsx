import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, Alert as NativeAlert, ScrollView, Linking, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Modal, Button, BottomSheet } from '@/components/common';
import { Alert } from '@/types/models';
import { useAlertStore } from '@/store/alertStore';
import { useLocation } from '@/hooks/useLocation';
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
  const { currentLocation } = useLocation();
  const [showDeclineReasons, setShowDeclineReasons] = useState(false);
  const [isResponding, setIsResponding] = useState(false);

  const declineReasons = [
    { id: 'too-far', label: 'Too far away', icon: 'location-off' },
    { id: 'not-safe', label: 'Not safe for me', icon: 'block' },
    { id: 'busy', label: 'Currently busy', icon: 'schedule' },
    { id: 'other', label: 'Other reason', icon: 'more-horiz' },
  ];

  const openGoogleMapsNavigation = () => {
    const origin = currentLocation 
      ? `${currentLocation.latitude},${currentLocation.longitude}`
      : '';
    const destination = `${alert.location.latitude},${alert.location.longitude}`;
    
    const url = Platform.select({
      ios: `comgooglemaps://?saddr=${origin}&daddr=${destination}&directionsmode=driving`,
      android: `google.navigation:q=${destination}&mode=d`,
    });

    const fallbackUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;

    Linking.canOpenURL(url!)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url!);
        } else {
          return Linking.openURL(fallbackUrl);
        }
      })
      .catch(() => {
        Linking.openURL(fallbackUrl);
      });
  };

  const handleRespond = async () => {
    try {
      setIsResponding(true);
      await respondToAlert(alert.id);
      
      onClose();
      
      // Navigate to in-app responder navigation screen first
      try {
        const parentNavigation = (navigation as any).getParent?.();
        if (parentNavigation?.navigate) {
          parentNavigation.navigate('Emergency', {
            screen: 'ResponderNavigation',
            params: { alertId: alert.id },
          });
        } else {
          (navigation as any).navigate('ResponderNavigation', { alertId: alert.id });
        }
      } catch (navError) {
        // If in-app navigation fails, fallback to Google Maps
        console.warn('In-app navigation failed, opening Google Maps:', navError);
        openGoogleMapsNavigation();
      }
    } catch (error) {
      console.warn('Error responding to alert:', error);
      NativeAlert.alert('Could not respond', 'We could not accept this alert right now.');
    } finally {
      setIsResponding(false);
    }
  };

  const handleDecline = (reasonId: string) => {
    console.info('Responder declined alert', { alertId: alert.id, reasonId });
    setShowDeclineReasons(false);
    onClose();
  };

  return (
    <>
      <Modal visible={visible} onClose={onClose} dismissOnBackdrop={false} noAnimation={true}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          bounces={true}
        >
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
                <Text style={styles.infoText}>
                  {alert.usersNotified ? `${alert.usersNotified} nearby users notified` : 'Nearby users have been notified'}
                </Text>
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
                disabled={isResponding}
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
                disabled={isResponding}
              >
                Decline
              </Button>
            </View>
          </View>
        </ScrollView>
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
  scrollView: {
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    paddingVertical: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
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
    flex: 1,
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
    flex: 1,
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
