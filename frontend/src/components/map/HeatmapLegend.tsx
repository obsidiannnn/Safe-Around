import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { colors } from '@/theme/colors';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

interface LegendItem {
  color: string;
  label: string;
  range: string;
}

const legendItems: LegendItem[] = [
  { color: colors.success, label: 'Low Crime', range: '0-25' },
  { color: '#FDD835', label: 'Medium Crime', range: '26-50' },
  { color: colors.warning, label: 'High Crime', range: '51-75' },
  { color: colors.error, label: 'Very High Crime', range: '76-100' },
];

/**
 * Heatmap legend with color scale and labels
 * Supports minimize/expand animation
 */
export const HeatmapLegend: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const height = useSharedValue(200);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    height.value = withTiming(isExpanded ? 60 : 200, { duration: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Pressable onPress={toggleExpand} style={styles.header}>
        <Text style={styles.title}>Crime Heatmap</Text>
        <Icon
          name={isExpanded ? 'expand-less' : 'expand-more'}
          size={24}
          color={colors.textPrimary}
        />
      </Pressable>

      {isExpanded && (
        <View style={styles.content}>
          {legendItems.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.colorBox, { backgroundColor: item.color }]} />
              <View style={styles.legendText}>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.range}>{item.range}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...shadows.medium,
    overflow: 'hidden',
    width: 170,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm + 4,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  colorBox: {
    width: 14,
    height: 14,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  legendText: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  range: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
