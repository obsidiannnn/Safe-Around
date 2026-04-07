import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Vibration, Pressable, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Text, Switch } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { Modal } from '@/components/common';
import { useAlertStore } from '@/store/alertStore';
import { useLocationStore } from '@/store/locationStore';
import { colors } from '@/theme/colors';
import { spacing, borderRadius, shadows } from '@/theme/spacing';

interface EmergencyTriggerModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * High-impact fullscreen emergency alert confirmation modal
 */
export const EmergencyTriggerModal: React.FC<EmergencyTriggerModalProps> = ({
  visible,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { createAlert } = useAlertStore();
  const { currentLocation } = useLocationStore();
  const [silentMode, setSilentMode] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isConfirming, setIsConfirming] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    if (visible) {
      setCountdown(5);
      setIsConfirming(false);
      setHasTriggered(false);
      navigation.getParent()?.setOptions({
        tabBarStyle: { display: 'none' }
      });
    }

    return () => {
      navigation.getParent()?.setOptions({
        tabBarStyle: {
          height: 52 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 10,
          overflow: 'visible',
        }
      });
    };
  }, [visible, insets.bottom, navigation]);

  const handleConfirm = useCallback(async () => {
    if (!currentLocation || isConfirming || hasTriggered) return;

    try {
      setHasTriggered(true);
      setIsConfirming(true);
      if (!silentMode) {
        Vibration.vibrate([0, 500, 200, 500]);
      }

      await createAlert(
        {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        },
        silentMode
      );

      onClose();
      navigation.navigate('EmergencyActive' as never);
    } catch (error) {
      console.warn('Error creating alert:', error);
      setCountdown(5);
      setHasTriggered(false);
      Alert.alert('SOS failed', 'We could not send the emergency alert. Please check your connection and try again.');
    } finally {
      setIsConfirming(false);
    }
  }, [currentLocation, isConfirming, hasTriggered, silentMode, createAlert, onClose, navigation]);

  useEffect(() => {
    if (!visible || isConfirming) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }

    handleConfirm();
  }, [visible, countdown, isConfirming, handleConfirm]);

  const formatCoordinate = (value: number, positive: string, negative: string) => {
    return `${Math.abs(value).toFixed(4)}° ${value >= 0 ? positive : negative}`;
  };

  return (
    <Modal visible={visible} onClose={onClose} dismissOnBackdrop={false} fullScreen noAnimation>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Icon name="security" size={24} color={colors.surface} />
            <Text style={styles.brandText}>SafeAround</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={28} color={colors.surface} />
          </Pressable>
        </View>

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.mainContent}>
            <Text style={styles.alertingSub}>EMERGENCY SOS ACTIVE</Text>
            <View style={styles.countdownBadge}>
              <Icon name="timer" size={16} color={colors.surface} />
              <Text style={styles.countdownBadgeText}>{isConfirming ? 'Sending SOS now' : `Auto-send in ${countdown}s`}</Text>
            </View>
            <Text style={styles.alertingTitle}>{isConfirming ? 'Sending SOS' : 'Emergency ready'}</Text>
            <Text style={styles.alertingDescription}>
              Your contacts and nearby responders will receive your live location.
            </Text>

            <View style={styles.pulseContainer}>
              <Pressable 
                style={[styles.sosCircle, isConfirming && styles.sosCircleDisabled]}
                onPress={handleConfirm}
                disabled={isConfirming}
              >
                {isConfirming ? (
                  <ActivityIndicator color={colors.surface} size="large" />
                ) : (
                  <Icon name="settings-input-antenna" size={40} color={colors.surface} />
                )}
                <Text style={styles.sendNowText}>{isConfirming ? 'SENDING' : 'SEND NOW'}</Text>
              </Pressable>
            </View>

            <Text style={styles.instructionText}>
              Tap send now to skip the timer, or cancel if this was accidental.
            </Text>

            <View style={styles.optionsList}>
              <View style={styles.glassOption}>
                <View style={styles.optionInfo}>
                  <View style={styles.optionIconBox}>
                    <Icon name="volume-off" size={20} color={colors.surface} />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>Silent Mode</Text>
                    <Text style={styles.optionSub}>No siren or visuals on screen</Text>
                  </View>
                </View>
                <Switch value={silentMode} onValueChange={setSilentMode} color={colors.surface} />
              </View>

              <View style={styles.glassOption}>
                <View style={styles.optionInfo}>
                  <View style={styles.optionIconBox}>
                    <Icon name="sms" size={20} color={colors.surface} />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>Emergency SMS</Text>
                    <Text style={styles.optionSub}>Contacts receive your pinned location</Text>
                  </View>
                </View>
                <View style={styles.includedBadge}>
                  <Text style={styles.includedText}>Included</Text>
                </View>
              </View>

              <View style={styles.glassOption}>
                <View style={styles.optionInfo}>
                  <View style={styles.optionIconBox}>
                    <Icon name="hub" size={20} color={colors.surface} />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>Broadcast to Nearby Users</Text>
                    <Text style={styles.optionSub}>Alert verified citizens in 500m</Text>
                  </View>
                </View>
                <View style={styles.includedBadge}>
                  <Text style={styles.includedText}>Included</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {currentLocation && (
            <View style={styles.coordBox}>
              <Icon name="location-pin" size={14} color={colors.surface} />
              <Text style={styles.coordText}>
                PINPOINTED: {formatCoordinate(currentLocation.latitude, 'N', 'S')}, {formatCoordinate(currentLocation.longitude, 'E', 'W')}
              </Text>
            </View>
          )}
          <Pressable style={[styles.cancelBtn, isConfirming && styles.cancelBtnDisabled]} onPress={onClose} disabled={isConfirming}>
            <Text style={styles.cancelBtnText}>{isConfirming ? 'SENDING ALERT...' : 'CANCEL SOS'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E0B3B',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    flexGrow: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 28,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  alertingSub: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
    marginBottom: spacing.md,
  },
  countdownBadgeText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '800',
    marginLeft: spacing.xs,
  },
  alertingTitle: {
    color: colors.surface,
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
  },
  alertingDescription: {
    color: 'rgba(255, 255, 255, 0.68)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  pulseContainer: {
    width: 168,
    height: 168,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sosCircle: {
    width: 138,
    height: 138,
    borderRadius: 69,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.premium,
    borderWidth: 8,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sosCircleDisabled: {
    opacity: 0.78,
  },
  sendNowText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 8,
  },
  instructionText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  optionsList: {
    width: '100%',
    gap: 12,
  },
  glassOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  optionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '700',
  },
  optionSub: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    marginTop: 2,
  },
  includedBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  includedText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg,
    alignItems: 'center',
  },
  coordBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  coordText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 6,
  },
  cancelBtn: {
    backgroundColor: colors.surface,
    width: '100%',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnDisabled: {
    opacity: 0.7,
  },
  cancelBtnText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
