import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatCard } from '@/components/profile/StatCard';
import { RatingDisplay, RatingBreakdown } from '@/components/profile/RatingDisplay';
import { useAuthStore } from '@/store/authStore';
import { useNavigation } from '@react-navigation/native';
import { feedbackService, UserRatingStats } from '@/services/api/feedbackService';
import { colors } from '@/theme/colors';
import { spacing, borderRadius, shadows } from '@/theme/spacing';

interface ProfileStats {
  totalAlerts: number;
  helpedOthers: number;
  trustScore: number;
  emergencyContacts: number;
}

interface ProfileOverviewTabProps {
  stats: ProfileStats;
}

export const ProfileOverviewTab: React.FC<ProfileOverviewTabProps> = ({ stats }) => {
  const { user } = useAuthStore();
  const navigation = useNavigation();
  const [ratingStats, setRatingStats] = useState<UserRatingStats | null>(null);
  const [loadingRatings, setLoadingRatings] = useState(true);

  useEffect(() => {
    const loadRatings = async () => {
      if (!user?.id) return;

      try {
        setLoadingRatings(true);
        const ratings = await feedbackService.getUserRatings(user.id);
        setRatingStats(ratings);
      } catch (error) {
        console.warn('Failed to load user ratings:', error);
      } finally {
        setLoadingRatings(false);
      }
    };

    loadRatings();
  }, [user?.id]);

  const trustLabel = stats.trustScore >= 80 ? 'HIGH TRUST LEVEL' : stats.trustScore >= 50 ? 'GROWING TRUST LEVEL' : 'SET UP YOUR TRUST PROFILE';

  const quickActions = [
    { id: 'edit', label: 'Edit Profile', icon: 'person-outline', screen: 'EditProfile' },
    { id: 'contacts', label: 'Contacts', icon: 'people-outline', screen: 'EmergencyContacts' },
    { id: 'privacy', label: 'Privacy', icon: 'shield-outline', screen: 'PrivacySettings' },
    { id: 'notifications', label: 'Alerts', icon: 'notifications-outline', screen: 'NotificationSettings' },
  ];

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.scoreHeader}>
        <View style={styles.radialContainer}>
          <View style={styles.radialOuter}>
            <View style={styles.radialInner}>
              <Text style={styles.scoreValue}>{stats.trustScore}</Text>
              <Text style={styles.scoreLabel}>TRUST SCORE</Text>
            </View>
          </View>
        </View>
        <View style={styles.trustBadge}>
          <Ionicons name="shield-checkmark" size={16} color={colors.secondary} />
          <Text style={styles.trustText}>{trustLabel}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard icon="warning-outline" value={stats.totalAlerts} label="Total Alerts" variant="primary" />
            <StatCard icon="heart-outline" value={stats.helpedOthers} label="Helped Others" variant="success" trend={stats.helpedOthers > 0 ? 'up' : undefined} />
          </View>
          <View style={styles.statsRow}>
            <StatCard icon="shield-outline" value={`${stats.trustScore}%`} label="Trust Rating" variant="success" />
            <StatCard icon="people-outline" value={stats.emergencyContacts} label="Emergency Contacts" variant="warning" />
          </View>
        </View>
      </View>

      {/* User Rating Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Helper Rating</Text>
        <View style={styles.card}>
          {loadingRatings ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Loading ratings...</Text>
            </View>
          ) : ratingStats && ratingStats.total_ratings > 0 ? (
            <>
              <View style={styles.ratingHeader}>
                <View style={styles.ratingMainInfo}>
                  <Text style={styles.ratingValue}>{ratingStats.average_rating.toFixed(1)}</Text>
                  <View style={styles.ratingStarsContainer}>
                    <RatingDisplay
                      averageRating={ratingStats.average_rating}
                      totalRatings={ratingStats.total_ratings}
                      showStars={true}
                      size="large"
                    />
                  </View>
                  <Text style={styles.ratingCount}>
                    Based on {ratingStats.total_ratings} rating{ratingStats.total_ratings !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
              
              <View style={styles.separator} />
              
              <View style={styles.breakdownSection}>
                <Text style={styles.breakdownTitle}>Rating Breakdown</Text>
                <RatingBreakdown
                  fiveStarCount={ratingStats.five_star_count}
                  fourStarCount={ratingStats.four_star_count}
                  threeStarCount={ratingStats.three_star_count}
                  twoStarCount={ratingStats.two_star_count}
                  oneStarCount={ratingStats.one_star_count}
                  totalRatings={ratingStats.total_ratings}
                />
              </View>
            </>
          ) : (
            <View style={styles.noRatingsContainer}>
              <Ionicons name="star-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.noRatingsTitle}>No ratings yet</Text>
              <Text style={styles.noRatingsText}>
                Help others in emergencies to receive ratings and build your helper reputation.
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Details</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="call-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoValue}>{user?.phone}</Text>
            </View>
            <Ionicons name="checkmark-circle" size={16} color={colors.secondary} />
          </View>
          
          <View style={styles.separator} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="mail-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email Address</Text>
              <Text style={styles.infoValue}>{user?.email || 'Add email for recovery'}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionCard}
              onPress={() => navigation.navigate(action.screen as never)}
            >
              <View style={styles.actionIconBox}>
                <Ionicons name={action.icon as any} size={24} color={colors.primary} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  scoreHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingVertical: spacing.lg,
  },
  radialContainer: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  radialOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 12,
    borderColor: '#E5E7EB',
    borderTopColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '45deg' }],
  },
  radialInner: {
    transform: [{ rotate: '-45deg' }],
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.secondary}15`,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  trustText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.secondary,
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginLeft: 4,
  },
  statsGrid: {
    gap: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.medium,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${colors.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: spacing.xs,
    marginLeft: 48,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionCard: {
    width: '47.5%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.small,
  },
  actionIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  ratingHeader: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  ratingMainInfo: {
    alignItems: 'center',
  },
  ratingValue: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  ratingStarsContainer: {
    marginBottom: spacing.sm,
  },
  ratingCount: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  breakdownSection: {
    paddingTop: spacing.md,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  noRatingsContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  noRatingsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  noRatingsText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
