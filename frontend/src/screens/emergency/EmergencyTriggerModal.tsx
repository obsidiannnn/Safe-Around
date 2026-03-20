import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Vibration } from 'react-native';
import { Text, Switch } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { Modal, Button } from '@/components/common';
import { useAlertStore } from '@/store/alertStore';
import { useLocationStore } from '@/store/locationStore';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

interface EmergencyTriggerModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Emergency alert confirmation modal with countdown
 * Includes silent mode and audio recording options
 */
export const EmergencyTriggerModal: React.FC<EmergencyTriggerModalProps> = ({
  visible,
  onClose,
}) => {
  const navigation = useNavigation();
  const { createAlert } = useAlertStore();
  const { currentLocation } = useLocationStore();
  const [silentMode, setSilentMode] = useState(false);
  const [audioRecording, setAudioRecording] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (!visible) {
      setCountdown(10);
      return;
    }

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      handleConfirm();
    }
  }, [visible, countdown]);

  const handleConfirm = async () => {
    if (!currentLocation) {
      alert('Unable to get your location');
      return;
    }

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
      alert('Failed to create emergency alert');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleSkipCountdown = () => {
    setCountdown(0);
  };

  return (
    <Modal visible={visible} onClose={onClose} dismissOnBackdrop={false} fullScreen>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Icon name="warning" size={80} color={colors.error} />
        </View>

        <Text style={styles.title}>Send Emergency Alert?</Text>
        
        {currentLocation && (
          <View style={styles.locationContainer}>
            <Icon name="location-on" size={20} color={colors.textSecondary} />
            <Text style={styles.locationText}>
              {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
            </Text>
          </View>
        )}

        <View style={styles.options}>
          <View style={styles.option}>
            <View style={styles.optionLeft}>
              <Icon name="volume-off" size={24} color={colors.textPrimary} />
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Silent Mode</Text>
                <Text style={styles.optionDescription}>No sound or vibration</Text>
              </View>
            </View>
            <Switch
              value={silentMode}
              onValueChange={setSilentMode}
              color={colors.primary}
            />
          </View>

          <View style={styles.option}>
            <View style={styles.optionLeft}>
              <Icon name="mic" size={24} color={colors.textPrimary} />
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Audio Recording</Text>
                <Text style={styles.optionDescription}>Record 30 seconds</Text>
              </View>
            </View>
            <Switch
              value={audioRecording}
              onValueChange={setAudioRecording}
              color={colors.primary}
            />
          </View>
        </View>

        <View style={styles.countdownContainer}>
          <Text style={styles.countdownText}>Auto-sending in</Text>
          <View style={styles.countdownCircle}>
            <Text style={styles.countdownNumber}>{countdown}</Text>
          </View>
          <Text style={styles.countdownText}>seconds</Text>
        </View>

        <View style={styles.actions}>
          <Button
            variant="danger"
            size="large"
            fullWidth
            onPress={handleConfirm}
            loading={isConfirming}
            icon="warning"
          >
            Confirm Emergency
          </Button>

          {countdown > 0 && (
            <Button
              variant="outline"
              size="medium"
              fullWidth
              onPress={handleSkipCountdown}
            >
              Skip Countdown
            </Button>
          )}

          <Button
            variant="ghost"
            size="medium"
            fullWidth
            onPress={onClose}
            disabled={isConfirming}
          >
            Cancel
          </Button>
        </View>

        <Text style={styles.disclaimer}>
          Your emergency contacts will be notified with your location
        </Text>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing['2xl'],
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSizes['3xl'],
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  locationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing['2xl'],
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
  },
  locationText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  options: {
    marginBottom: spacing['2xl'],
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  optionTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  optionDescription: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  countdownContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  countdownText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  countdownCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.md,
  },
  countdownNumber: {
    fontSize: fontSizes['3xl'],
    fontWeight: '700',
    color: colors.surface,
  },
  actions: {
    gap: spacing.md,
  },
  disclaimer: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
