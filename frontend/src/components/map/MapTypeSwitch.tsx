import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '@/theme/colors';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

type MapType = 'standard' | 'satellite' | 'hybrid';

interface MapTypeSwitchProps {
  currentType: MapType;
  onTypeChange: (type: MapType) => void;
}

/**
 * Map type switcher for standard, satellite, and hybrid views
 */
export const MapTypeSwitch: React.FC<MapTypeSwitchProps> = ({
  currentType,
  onTypeChange,
}) => {
  const types: { value: MapType; label: string }[] = [
    { value: 'standard', label: 'Standard' },
    { value: 'satellite', label: 'Satellite' },
    { value: 'hybrid', label: 'Hybrid' },
  ];

  return (
    <View style={styles.container}>
      {types.map((type) => (
        <Pressable
          key={type.value}
          style={[
            styles.button,
            currentType === type.value && styles.activeButton,
          ]}
          onPress={() => onTypeChange(type.value)}
        >
          <Text
            style={[
              styles.buttonText,
              currentType === type.value && styles.activeButtonText,
            ]}
          >
            {type.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 80,
    right: spacing.lg,
    flexDirection: 'column',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    ...shadows.medium,
    overflow: 'hidden',
  },
  button: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minWidth: 90,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: colors.primary,
  },
  buttonText: {
    fontSize: fontSizes.xs,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  activeButtonText: {
    color: colors.surface,
    fontWeight: '600',
  },
});
