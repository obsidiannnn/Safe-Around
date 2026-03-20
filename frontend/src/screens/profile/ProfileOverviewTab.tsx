import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatCard } from '@/components/profile/StatCard';
import { useAuthStore } from '@/store/authStore';
import { useNavigation } from '@react-navigation/native';
import { theme } from '@/theme';
import { format } from 'date-fns';
import { colors } from '@/theme/colors';

export const ProfileOverviewTab: React.FC = () => {
  const { user } = useAuthStore();
  const navigation = useNavigation();

  const quickActions = [
    { id: 'edit', label: 'Edit Profile', icon: 'create', screen: 'EditProfile' },
    { id: 'contacts', label: 'Emergency Contacts', icon: 'people', screen: 'EmergencyContacts' },
    { id: 'privacy', label: 'Privacy', icon: 'shield', screen: 'PrivacySettings' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications', screen: 'NotificationSettings' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Information</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Ionicons name="call" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{user?.phone}</Text>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email || 'Not added'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.infoLabel}>Joined</Text>
            <Text style={styles.infoValue}>
              {user?.created_at ? format(new Date(user.created_at), 'MMM yyyy') : 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="warning" value={24} label="Total Alerts" variant="primary" />
          <StatCard icon="people" value={12} label="Helped Others" variant="success" trend="up" />
          <StatCard icon="shield-checkmark" value="98/100" label="Safety Score" variant="success" />
          <StatCard icon="star" value="High" label="Trust Level" variant="warning" />
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
              <Ionicons name={action.icon as any} size={32} color={theme.colors.primary} />
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  infoLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    width: 80,
  },
  infoValue: {
    flex: 1,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
  },
  statsGrid: {
    gap: theme.spacing.sm,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  actionCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  actionLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    textAlign: 'center',
  },
});
