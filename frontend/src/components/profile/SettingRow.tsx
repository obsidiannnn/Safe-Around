import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '@/components/common/Badge';
import { theme } from '@/theme';

interface SettingRowProps {
  icon: string;
  title: string;
  subtitle?: string;
  rightElement?: 'toggle' | 'chevron' | 'badge' | 'text';
  rightValue?: string | number | boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
  disabled?: boolean;
}

export const SettingRow: React.FC<SettingRowProps> = ({
  icon,
  title,
  subtitle,
  rightElement = 'chevron',
  rightValue,
  onPress,
  onToggle,
  disabled = false,
}) => {
  const renderRightElement = () => {
    switch (rightElement) {
      case 'toggle':
        return (
          <Switch
            value={rightValue as boolean}
            onValueChange={onToggle}
            disabled={disabled}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        );
      case 'badge':
        return <Badge variant="notification" count={rightValue as number} color="red" />;
      case 'text':
        return <Text style={styles.rightText}>{rightValue}</Text>;
      case 'chevron':
      default:
        return <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled || rightElement === 'toggle'}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={icon as any} size={24} color={theme.colors.primary} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {renderRightElement()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  disabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  rightText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.xs,
  },
});
