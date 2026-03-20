import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { Button } from './Button';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

type EmptyStateType = 'no-data' | 'error' | 'offline';

interface EmptyStateProps {
  type?: EmptyStateType;
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Empty state component for displaying no data, errors, or offline states
 * Supports custom icons and action buttons
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'no-data',
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  const getDefaultIcon = () => {
    switch (type) {
      case 'no-data':
        return 'inbox';
      case 'error':
        return 'error-outline';
      case 'offline':
        return 'wifi-off';
    }
  };

  const iconName = icon || getDefaultIcon();

  return (
    <View style={styles.container}>
      <Icon name={iconName} size={64} color={colors.textSecondary} />
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionLabel && onAction && (
        <Button variant="primary" onPress={onAction} size="medium">
          {actionLabel}
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  description: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
});
