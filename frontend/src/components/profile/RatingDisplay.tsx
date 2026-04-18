import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

interface RatingDisplayProps {
  averageRating: number;
  totalRatings: number;
  showStars?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const RatingDisplay: React.FC<RatingDisplayProps> = ({
  averageRating,
  totalRatings,
  showStars = true,
  size = 'medium',
}) => {
  const starSize = size === 'small' ? 14 : size === 'medium' ? 16 : 20;
  const fontSize = size === 'small' ? 12 : size === 'medium' ? 14 : 16;

  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(averageRating);
    const hasHalfStar = averageRating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Ionicons key={i} name="star" size={starSize} color="#FDD835" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Ionicons key={i} name="star-half" size={starSize} color="#FDD835" />
        );
      } else {
        stars.push(
          <Ionicons key={i} name="star-outline" size={starSize} color="#E0E0E0" />
        );
      }
    }

    return stars;
  };

  if (totalRatings === 0) {
    return (
      <View style={styles.container}>
        <Text style={[styles.noRatingText, { fontSize }]}>No ratings yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showStars && <View style={styles.starsRow}>{renderStars()}</View>}
      <Text style={[styles.ratingText, { fontSize }]}>
        {averageRating.toFixed(1)} ({totalRatings})
      </Text>
    </View>
  );
};

interface RatingBreakdownProps {
  fiveStarCount: number;
  fourStarCount: number;
  threeStarCount: number;
  twoStarCount: number;
  oneStarCount: number;
  totalRatings: number;
}

export const RatingBreakdown: React.FC<RatingBreakdownProps> = ({
  fiveStarCount,
  fourStarCount,
  threeStarCount,
  twoStarCount,
  oneStarCount,
  totalRatings,
}) => {
  const getPercentage = (count: number) => {
    if (totalRatings === 0) return 0;
    return (count / totalRatings) * 100;
  };

  const renderBar = (stars: number, count: number) => {
    const percentage = getPercentage(count);

    return (
      <View key={stars} style={styles.barRow}>
        <View style={styles.barLabel}>
          <Text style={styles.barStars}>{stars}</Text>
          <Ionicons name="star" size={12} color="#FDD835" />
        </View>
        <View style={styles.barContainer}>
          <View style={[styles.barFill, { width: `${percentage}%` }]} />
        </View>
        <Text style={styles.barCount}>{count}</Text>
      </View>
    );
  };

  if (totalRatings === 0) {
    return (
      <View style={styles.breakdownContainer}>
        <Text style={styles.noRatingText}>No ratings to display</Text>
      </View>
    );
  }

  return (
    <View style={styles.breakdownContainer}>
      {renderBar(5, fiveStarCount)}
      {renderBar(4, fourStarCount)}
      {renderBar(3, threeStarCount)}
      {renderBar(2, twoStarCount)}
      {renderBar(1, oneStarCount)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: spacing.xs,
  },
  noRatingText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  breakdownContainer: {
    gap: spacing.sm,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  barLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    width: 32,
  },
  barStars: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#FDD835',
    borderRadius: 4,
  },
  barCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    width: 32,
    textAlign: 'right',
  },
});
