import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/theme';

type SharingMode = 'always' | 'alerts_only' | 'never';

interface LocationSharingToggleProps {
  value: SharingMode;
  onChange: (mode: SharingMode) => void;
}

export const LocationSharingToggle: React.FC<LocationSharingToggleProps> = ({
  value,
  onChange,
}) => {
  const options: Array<{ mode: SharingMode; label: string; icon: string; description: string }> = [
    {
      mode: 'always',
      label: 'Always',
      icon: 'location',
      description: 'Share location continuously',
    },
    {
      mode: 'alerts_only',
      label: 'During Alerts Only',
      icon: 'alert-circle',
      description: 'Share only when alert is active',
    },
    {
      mode: 'never',
      label: 'Never',
      icon: 'location-off',
      description: 'Don\'t share location',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Location Sharing</Text>
      
      {options.map((option) => (
        <TouchableOpacity
          key={option.mode}
          style={[
            styles.option,
            value === option.mode && styles.optionActive,
          ]}
          onPress={() => onChange(option.mode)}
          accessibilityLabel={`${option.label} location sharing`}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === option.mode }}
        >
          <View style={styles.optionLeft}>
            <Ionicons
              name={option.icon as any}
              size={24}
              color={value === option.mode ? theme.colors.primary : theme.colors.textSecondary}
            />
            <View style={styles.optionText}>
              <Text style={[styles.optionLabel, value === option.mode && styles.optionLabelActive]}>
                {option.label}
              </Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
          </View>
          {value === option.mode && (
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
          )}
        </TouchableOpacity>
      ))}

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color={theme.colors.info} />
        <Text style={styles.infoText}>
          {value === 'always' && 'Higher battery usage. Location shared with nearby users.'}
          {value === 'alerts_only' && 'Balanced privacy and safety. Recommended setting.'}
          {value === 'never' && 'Maximum privacy but limited safety features.'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionActive: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}10`,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionText: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  optionLabel: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  optionLabelActive: {
    fontWeight: theme.typography.weights.bold,
  },
  optionDescription: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: `${theme.colors.info}15`,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
  },
  infoText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
});
