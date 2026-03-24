import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Vibration, Pressable, Platform } from 'react-native';
import { Text, Switch } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
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
  const navigation = useNavigation();
  const { createAlert } = useAlertStore();
  const { currentLocation } = useLocationStore();
  const [silentMode, setSilentMode] = useState(false);
  const [audioRecording, setAudioRecording] = useState(true);
  const [broadcastNearby, setBroadcastNearby] = useState(true);
  const [countdown, setCountdown] = useState(5);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (!visible) {
      setCountdown(5);
      return;
    }

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
        if (countdown === 1) handleConfirm();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [visible, countdown]);

  const handleConfirm = async () => {
    if (!currentLocation || isConfirming) return;

    try {
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
      console.error('Error creating alert:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} dismissOnBackdrop={false} fullScreen>
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

        <View style={styles.mainContent}>
          <Text style={styles.alertingSub}>EMERGENCY SOS ACTIVE</Text>
          <Text style={styles.alertingTitle}>Alerting in {countdown}...</Text>

          <View style={styles.pulseContainer}>
            <Pressable 
              style={styles.sosCircle}
              onPress={handleConfirm}
            >
              <Icon name="settings-input-antenna" size={40} color={colors.surface} />
              <Text style={styles.sendNowText}>SEND NOW</Text>
            </Pressable>
          </View>

          <Text style={styles.instructionText}>
            Hold to immediately notify emergency contacts{"\n"}and local authorities.
          </Text>

          <View style={styles.optionsList}>
            <View style={styles.glassOption}>
              <View style={styles.optionInfo}>
                <View style={styles.optionIconBox}>
                  <Icon name="volume-off" size={20} color={colors.surface} />
                </View>
                <View>
                  <Text style={styles.optionTitle}>Silent Mode</Text>
                  <Text style={styles.optionSub}>No siren or visuals on screen</Text>
                </View>
              </View>
              <Switch value={silentMode} onValueChange={setSilentMode} color={colors.surface} />
            </View>

            <View style={styles.glassOption}>
              <View style={styles.optionInfo}>
                <View style={styles.optionIconBox}>
                  <Icon name="mic" size={20} color={colors.surface} />
                </View>
                <View>
                  <Text style={styles.optionTitle}>Start Audio Recording</Text>
                  <Text style={styles.optionSub}>Capturing evidence in real-time</Text>
                </View>
              </View>
              <Switch value={audioRecording} onValueChange={setAudioRecording} color={colors.surface} />
            </View>

            <View style={styles.glassOption}>
              <View style={styles.optionInfo}>
                <View style={styles.optionIconBox}>
                  <Icon name="hub" size={20} color={colors.surface} />
                </View>
                <View>
                  <Text style={styles.optionTitle}>Broadcast to Nearby Users</Text>
                  <Text style={styles.optionSub}>Alert verified citizens in 500m</Text>
                </View>
              </View>
              <Switch value={broadcastNearby} onValueChange={setBroadcastNearby} color={colors.surface} />
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          {currentLocation && (
            <View style={styles.coordBox}>
              <Icon name="location-pin" size={14} color={colors.surface} />
              <Text style={styles.coordText}>
                PINPOINTED: {currentLocation.latitude.toFixed(4)}° N, {currentLocation.longitude.toFixed(4)}° W
              </Text>
            </View>
          )}
          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>CANCEL</Text>
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
    paddingHorizontal: spacing.xl,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
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
    paddingTop: 40,
  },
  alertingSub: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  alertingTitle: {
    color: colors.surface,
    fontSize: 48,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 40,
  },
  pulseContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  sosCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.premium,
    borderWidth: 8,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    marginBottom: 40,
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
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
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
  footer: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  coordBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 24,
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
  cancelBtnText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
