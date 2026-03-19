import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/theme';

interface BackgroundLocationIndicatorProps {
  isActive: boolean;
  batteryImpact: 'low' | 'medium' | 'high';
  onPress?: () => void;
}

export const BackgroundLocationIndicator: React.FC<BackgroundLocationIndicatorProps> = ({
  isActive,
  batteryImpact,
  onPress,
}) => {
  const getBatteryColor = () => {
    switch (batteryImpact) {
      case 'low':
        return theme.colors.success;
      case 'medium':
        return theme.colors.warning;
      case 'high':
        return theme.colors.error;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, isActive && styles.containerActive]}
      onPress={onPress}
      accessibilityLabel={`Location tracking ${isActive ? 'active' : 'paused'}`}
      accessibilityRole="button"
    >
      <Ionicons
        name={isActive ? 'location' : 'location-outline'}
        size={16}
        color={isActive ? theme.colors.primary : theme.colors.textSecondary}
      />
      <Text style={[styles.text, isActive && styles.textActive]}>
        Location: {isActive ? 'Active' : 'Paused'}
      </Text>
      {isActive && (
        <View style={[styles.batteryDot, { backgroundColor: getBatteryColor() }]} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.pill,
    gap: theme.spacing.xs,
  },
  containerActive: {
    backgroundColor: `${theme.colors.primary}15`,
  },
  text: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
  },
  textActive: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.medium,
  },
  batteryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
