import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { spacing, borderRadius, shadows } from '@/theme/spacing';

interface TestEmergencyAlertButtonProps {
  onPress: () => void;
  style?: any;
}

/**
 * Test button to simulate incoming emergency alert
 * Only visible in development mode
 */
export const TestEmergencyAlertButton: React.FC<TestEmergencyAlertButtonProps> = ({
  onPress,
  style,
}) => {
  if (!__DEV__) {
    return null;
  }

  return (
    <Pressable
      style={[styles.button, style]}
      onPress={onPress}
    >
      <Icon name="bug-report" size={20} color={colors.surface} />
      <Text style={styles.text}>Test Alert</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    ...shadows.small,
    gap: spacing.xs,
  },
  text: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '700',
  },
});
