import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, Vibration } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { Modal, Button } from '@/components/common';
import { colors } from '@/theme/colors';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

interface EmergencySOSButtonProps {
  onEmergencyTrigger: () => void;
}

/**
 * Large emergency SOS button with long-press activation
 * Includes confirmation modal and haptic feedback
 */
export const EmergencySOSButton: React.FC<EmergencySOSButtonProps> = ({
  onEmergencyTrigger,
}) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.1, { duration: 1000 }),
      -1,
      true
    );
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 1000 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handleLongPress = () => {
    Vibration.vibrate([0, 100, 50, 100]);
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    setShowConfirmation(false);
    Vibration.vibrate(200);
    onEmergencyTrigger();
  };

  return (
    <>
      <Pressable
        style={styles.container}
        onLongPress={handleLongPress}
        delayLongPress={3000}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        accessibilityLabel="Emergency SOS button - Long press to activate"
        accessibilityRole="button"
        accessibilityHint="Long press for 3 seconds to send emergency alert"
      >
        <Animated.View style={[styles.pulse, animatedStyle]} />
        <View style={[styles.button, isPressed && styles.buttonPressed]}>
          <Icon name="warning" size={36} color={colors.surface} />
          <Text style={styles.text}>SOS</Text>
        </View>
      </Pressable>

      <Modal visible={showConfirmation} onClose={() => setShowConfirmation(false)}>
        <View style={styles.modalContent}>
          <Icon name="warning" size={64} color={colors.error} />
          <Text style={styles.modalTitle}>Send Emergency Alert?</Text>
          <Text style={styles.modalDescription}>
            This will immediately notify all your emergency contacts with your current location.
          </Text>
          
          <View style={styles.modalActions}>
            <Button
              variant="outline"
              size="large"
              onPress={() => setShowConfirmation(false)}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="large"
              onPress={handleConfirm}
              style={styles.confirmButton}
            >
              Confirm
            </Button>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 50, // Slightly higher to clear the new floating tab bar
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  pulse: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.error,
  },
  button: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.large,
    borderWidth: 4,
    borderColor: colors.surface,
  },
  buttonPressed: {
    transform: [{ scale: 0.95 }],
    backgroundColor: '#b71c1c', // Darker red on press
  },
  text: {
    fontSize: fontSizes.md,
    fontWeight: '800',
    color: colors.surface,
    marginTop: spacing.xs,
    letterSpacing: 1,
  },
  modalContent: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  modalTitle: {
    fontSize: fontSizes['2xl'],
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  modalDescription: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 1,
  },
});
