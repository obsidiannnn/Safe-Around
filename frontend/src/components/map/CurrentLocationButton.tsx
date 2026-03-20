import React, { useState } from 'react';
import { StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { spacing, borderRadius, shadows } from '@/theme/spacing';

interface CurrentLocationButtonProps {
  onPress: () => void;
}

/**
 * Floating button to center map on user's current location
 * Shows loading state while fetching location
 */
export const CurrentLocationButton: React.FC<CurrentLocationButtonProps> = ({ onPress }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = async () => {
    setIsLoading(true);
    await onPress();
    setTimeout(() => setIsLoading(false), 500);
  };

  return (
    <Pressable
      style={styles.button}
      onPress={handlePress}
      accessibilityLabel="Center map on current location"
      accessibilityRole="button"
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Icon name="my-location" size={24} color={colors.primary} />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 120,
    right: spacing.lg,
    width: 48,
    height: 48,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.medium,
  },
});
