import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, LayoutChangeEvent } from 'react-native';
import { theme } from '@/theme';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  onLayout?: (event: LayoutChangeEvent) => void;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ visible, message, onLayout }) => {
  if (!visible) return null;

  return (
    <View style={styles.overlay} onLayout={onLayout}>
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        {message && <Text style={styles.message}>{message}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  container: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    minWidth: 150,
  },
  message: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    textAlign: 'center',
  },
});
