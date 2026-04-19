import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, Alert as NativeAlert, ScrollView, Linking, Platform, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Button } from '@/components/common';
import { Alert } from '@/types/models';
import { useAlertStore } from '@/store/alertStore';
import { useLocation } from '@/hooks/useLocation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
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
  const insets = useSafeAreaInsets();
  const [showDeclineReasons, setShowDeclineReasons] = useState(false);
  const [isResponding, setIsResponding] = useState(false);

  const declineReasons = [
    { id: 'too-far', label: 'Too far away', icon: 'location-off' },
    { id: 'not-safe', label: 'Not safe for me', icon: 'block' },
    { id: 'busy', label: 'Currently busy', icon: 'schedule' },
    { id: 'other', label: 'Other reason', icon: 'more-horiz' },
  ];

  const openGoogleMapsNavigation = async (): Promise<boolean> => {
    const origin = currentLocation 
      ? `${currentLocation.latitude},${currentLocation.longitude}`
      : '';
    const destination = `${alert.location.latitude},${alert.location.longitude}`;
    
    const url = Platform.select({
      ios: `comgooglemaps://?saddr=${origin}&daddr=${destination}&directionsmode=driving`,
      android: `google.navigation:q=${destination}&mode=d`,
    });

    const fallbackUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;

    try {
      if (url && await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
        return true;
      }

      await Linking.openURL(fallbackUrl);
      return true;
    } catch (error) {
      console.warn('Unable to open external maps navigation:', error);
      return false;
    }
  };

  const handleRespond = async () => {
    try {
      setIsResponding(true);
      await respondToAlert(alert.id);
      onClose();

      // Try in-app navigation first
      try {
        const parentNavigation = (navigation as any).getParent?.();
        if (parentNavigation?.navigate) {
          parentNavigation.navigate('Emergency', {
            screen: 'ResponderNavigation',
            params: { alertId: alert.id },
          });
        } else {
          (navigation as any).navigate('Emergency', {
            screen: 'ResponderNavigation',
            params: { alertId: alert.id },
          });
        }
      } catch (navigationError) {
        console.warn('In-app navigation failed, opening Google Maps directly:', navigationError);
        
        // Open Google Maps immediately without confirmation
        await openGoogleMapsNavigation();
      }
    } catch (error) {
      console.warn('Error responding to alert:', error);
      
      // If API fails, open Google Maps directly
      await openGoogleMapsNavigation();
    } finally {
      setIsResponding(false);
    }
  };

  const handleDecline = (reasonId: string) => {
    console.info('Responder declined alert', { alertId: alert.id, reasonId });
    setShowDeclineReasons(false);
    onClose();
  };

  if (!visible) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={[styles.overlay, { paddingBottom: insets.bottom + 76 }]}>
      <View style={styles.card}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalEyebrow}>Emergency Alert</Text>
            <Text style={styles.modalTitle}>Emergency Alert Nearby</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          bounces={true}
        >
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
              scrollEnabled={true}
              zoomEnabled={true}
              rotateEnabled={false}
              pitchEnabled={false}
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

              {currentLocation && (
                <Marker
                  coordinate={{
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                  }}
                >
                  <View style={styles.userMarker}>
                    <Icon name="my-location" size={16} color={colors.surface} />
                  </View>
                </Marker>
              )}
            </MapView>

            <View style={styles.mapHint}>
              <Icon name="zoom-out-map" size={14} color={colors.textSecondary} />
              <Text style={styles.mapHintText}>Pinch to zoom</Text>
            </View>
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
              onPress={() => setShowDeclineReasons((value) => !value)}
              disabled={isResponding}
            >
              {showDeclineReasons ? 'Hide options' : 'Decline'}
            </Button>
          </View>

          {showDeclineReasons ? (
            <View style={styles.inlineReasonsCard}>
              <View style={styles.inlineReasonsHeader}>
                <Text style={styles.inlineReasonsTitle}>Why can&apos;t you respond?</Text>
                <Pressable onPress={() => setShowDeclineReasons(false)} style={styles.reasonsCloseButton}>
                  <Icon name="close" size={18} color={colors.textSecondary} />
                </Pressable>
              </View>
              {declineReasons.map((reason) => (
                <Button
                  key={reason.id}
                  variant="outline"
                  size="medium"
                  fullWidth
                  icon={reason.icon}
                  onPress={() => handleDecline(reason.id)}
                  style={styles.reasonButton}
                >
                  {reason.label}
                </Button>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'center',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'transparent', // No grey backdrop
    pointerEvents: 'box-none', // Allow touches to pass through to bottom tabs
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    maxHeight: SCREEN_HEIGHT * 0.72,
    overflow: 'hidden',
    ...shadows.large,
    marginBottom: 80, // Leave space for bottom tabs
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalEyebrow: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  modalTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    maxHeight: SCREEN_HEIGHT * 0.62,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
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
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapHint: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  mapHintText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  userMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
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
  inlineReasonsCard: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inlineReasonsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  inlineReasonsTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  reasonsCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reasonButton: {
    marginBottom: spacing.sm,
  },
});
