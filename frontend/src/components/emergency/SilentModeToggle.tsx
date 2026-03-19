import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Switch } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

interface SilentModeToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  showTooltip?: boolean;
}

/**
 * Silent mode toggle for emergency alerts
 * Silent: No sound/vibration, Alert: Loud siren/vibration
 */
export const SilentModeToggle: React.FC<SilentModeToggleProps> = ({
  value,
  onValueChange,
  showTooltip = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Icon
          name={value ? 'volume-off' : 'volume-up'}
          size={24}
          color={colors.textPrimary}
        />
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {value ? 'Silent Mode' : 'Alert Mode'}
          </Text>
          <Text style={styles.description}>
            {value
              ? 'No sound or vibration, discrete alert'
              : 'Loud siren, vibration, and flash'}
          </Text>
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          color={colors.primary}
        />
      </View>

      {showTooltip && (
        <View style={styles.tooltip}>
          <Icon name="info" size={16} color={colors.secondary} />
          <Text style={styles.tooltipText}>
            Silent mode is recommended for situations where making noise could increase danger
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  title: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  description: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  tooltip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: `${colors.secondary}10`,
    borderRadius: borderRadius.sm,
  },
  tooltipText: {
    flex: 1,
    fontSize: fontSizes.xs,
    color: colors.secondary,
    marginLeft: spacing.sm,
    lineHeight: 16,
  },
});
