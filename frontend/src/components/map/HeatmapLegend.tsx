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
    position: 'absolute',
    top: 80,
    left: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    ...shadows.medium,
    overflow: 'hidden',
    width: 180,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  title: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  colorBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  legendText: {
    flex: 1,
  },
  label: {
    fontSize: fontSizes.xs,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  range: {
    fontSize: 10,
    color: colors.textSecondary,
  },
});
