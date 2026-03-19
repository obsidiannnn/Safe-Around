import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/theme';

interface AccuracyIndicatorProps {
  accuracy: number; // in meters
}

export const AccuracyIndicator: React.FC<AccuracyIndicatorProps> = ({ accuracy }) => {
  const getAccuracyLevel = () => {
    if (accuracy < 20) return { level: 'High', color: theme.colors.success, icon: 'checkmark-circle' };
    if (accuracy < 50) return { level: 'Medium', color: theme.colors.warning, icon: 'warning' };
    return { level: 'Low', color: theme.colors.error, icon: 'alert-circle' };
  };

  const getSuggestion = () => {
    if (accuracy >= 50) return 'Move to open area';
    if (accuracy >= 20) return 'Check GPS settings';
    return null;
  };

  const { level, color, icon } = getAccuracyLevel();
  const suggestion = getSuggestion();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name={icon as any} size={16} color={color} />
        <Text style={[styles.level, { color }]}>{level}</Text>
        <Text style={styles.accuracy}>±{Math.round(accuracy)}m</Text>
      </View>
      {suggestion && (
        <Text style={styles.suggestion}>{suggestion}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  level: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
  },
  accuracy: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  suggestion: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
});
