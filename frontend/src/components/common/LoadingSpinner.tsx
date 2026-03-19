import React from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type SpinnerSize = 'small' | 'medium' | 'large';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  color?: string;
  fullScreen?: boolean;
  message?: string;
}

/**
 * Loading spinner component with full screen overlay option
 * Supports different sizes and custom colors
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color = colors.primary,
  fullScreen = false,
  message,
}) => {
  const getSize = () => {
    switch (size) {
      case 'small':
        return 20;
      case 'medium':
        return 32;
      case 'large':
        return 48;
    }
  };

  const spinner = (
    <View style={[styles.container, fullScreen && styles.fullScreenContainer]}>
      <ActivityIndicator size={getSize()} color={color} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );

  if (fullScreen) {
    return (
      <Modal transparent visible animationType="fade">
        <View style={styles.overlay}>{spinner}</View>
      </Modal>
    );
  }

  return spinner;
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenContainer: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    marginTop: spacing.md,
    color: colors.textPrimary,
  },
});
