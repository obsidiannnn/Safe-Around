import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { Avatar } from '@/components/common/Avatar';
import { ProfileOverviewTab } from './ProfileOverviewTab';
import { SettingsTab } from './SettingsTab';
import { ActivityTab } from './ActivityTab';
import { HelpTab } from './HelpTab';
import { useAuthStore } from '@/store/authStore';
import { profileApiService } from '@/services/api/profileApiService';
import { colors } from '@/theme/colors';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

type Tab = 'overview' | 'settings' | 'activity' | 'help';

export const ProfileScreen: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  useEffect(() => {
    let mounted = true;

    const refreshProfile = async () => {
      try {
        const latestUser = await profileApiService.getProfile();
        if (mounted) {
          setUser(latestUser);
        }
      } catch (error) {
        console.error('Failed to refresh profile stats:', error);
      }
    };

    refreshProfile();
    return () => {
      mounted = false;
    };
  }, [setUser]);

  const profileStats = useMemo(() => ({
    totalAlerts: user?.total_alerts_triggered ?? 0,
    helpedOthers: user?.people_helped_count ?? 0,
    trustScore: Math.round(user?.trust_level_score ?? 0),
    emergencyContacts: user?.emergency_contacts ?? 0,
  }), [user]);

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview', icon: 'person' },
    { id: 'settings' as Tab, label: 'Settings', icon: 'settings' },
    { id: 'activity' as Tab, label: 'Activity', icon: 'time' },
    { id: 'help' as Tab, label: 'Help', icon: 'help-circle' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <ProfileOverviewTab stats={profileStats} />;
      case 'settings':
        return <SettingsTab />;
      case 'activity':
        return <ActivityTab />;
      case 'help':
        return <HelpTab />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Avatar
          size="large"
          name={user?.name ?? 'User'}
        />
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {user?.name ?? 'User'}
            </Text>
            <Icon name="verified" size={18} color={colors.secondary} />
          </View>
          <View style={styles.statusBadge}>
            <Icon name="shield" size={12} color={colors.secondary} />
            <Text style={styles.statusText}>VERIFIED CITIZEN</Text>
          </View>
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profileStats.totalAlerts}</Text>
              <Text style={styles.statLabel}>ALERTS</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profileStats.helpedOthers}</Text>
              <Text style={styles.statLabel}>HELPED</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profileStats.trustScore}%</Text>
              <Text style={styles.statLabel}>TRUST</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Icon
              name={tab.icon === 'person' ? 'person' : tab.icon === 'settings' ? 'settings' : tab.icon === 'time' ? 'history' : 'help-outline'}
              size={20}
              color={activeTab === tab.id ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.activeTabLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>{renderContent()}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    gap: spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 142, 62, 0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.secondary,
    marginLeft: 4,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSizes.md,
    fontWeight: '800',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  activeTab: {
    backgroundColor: 'rgba(26, 115, 232, 0.08)',
  },
  tabLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  activeTabLabel: {
    color: colors.primary,
    fontWeight: '800',
  },
  content: {
    flex: 1,
  },
});
