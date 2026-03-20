import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';
import { formatTimeAgo } from '@/utils/formatters';

interface LocationStreamIndicatorProps {
  accuracy?: number;
  lastUpdated: string;
}

/**
 * Indicator showing live location streaming status
 * Displays GPS accuracy and battery warning
 */
export const LocationStreamIndicator: React.FC<LocationStreamIndicatorProps> = ({
  accuracy,
  lastUpdated,
}) => {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.5, { duration: 1000 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View style={animatedStyle}>
          <Icon name="my-location" size={16} color={colors.success} />
        </Animated.View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Sharing live location</Text>
          <Text style={styles.subtitle}>
            {accuracy ? `±${Math.round(accuracy)}m accuracy` : 'Getting location...'}
            {' • '}
            {formatTimeAgo(lastUpdated)}
          </Text>
        </View>
      </View>

      <View style={styles.warning}>
        <Icon name="battery-alert" size={14} color={colors.warning} />
        <Text style={styles.warningText}>High battery usage</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  textContainer: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  title: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningText: {
    fontSize: fontSizes.xs,
    color: colors.warning,
    marginLeft: spacing.xs,
  },
});
