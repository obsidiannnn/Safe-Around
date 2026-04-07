import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SettingRow } from '@/components/profile/SettingRow';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { colors } from '@/theme/colors';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { Button } from '@/components/common/Button';

export const SettingsTab: React.FC = () => {
  const { user } = useAuthStore();
  const {
    locationSharingMode,
    dangerZoneWarningDistance,
    priorityAlerts,
    shakeToSOS,
    setLocationSharingMode,
    setDangerZoneWarningDistance,
    setPriorityAlerts,
    setShakeToSOS,
  } = useSettingsStore();
  const { logOut } = useAuth();
  const nextLocationMode = locationSharingMode === 'always' ? 'alerts_only' : locationSharingMode === 'alerts_only' ? 'never' : 'always';
  const locationModeLabel = locationSharingMode === 'always' ? 'Always share live location' : locationSharingMode === 'alerts_only' ? 'Only share during SOS alerts' : 'Do not share live location';
  const nextWarningDistance = dangerZoneWarningDistance === 250 ? 500 : dangerZoneWarningDistance === 500 ? 1000 : 250;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.securityStatusCard}>
        <View style={styles.statusHeader}>
          <Icon name="verified-user" size={20} color={colors.secondary} />
          <Text style={styles.statusTitle}>Secure Session Active</Text>
        </View>
        <Text style={styles.statusSubtitle}>Authenticated session protected by your device and account token</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACCOUNT SECURITY</Text>
        <SettingRow
          icon="shield-checkmark"
          title="Phone Verification"
          subtitle={user?.is_phone_verified ? 'Your phone is verified for account recovery' : 'Verify your phone to improve account security'}
          rightElement="text"
          rightValue={user?.is_phone_verified ? 'Verified' : 'Pending'}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PRIVACY CONTROLS</Text>
        <SettingRow
          icon="location"
          title="Live Location Sharing"
          subtitle={locationModeLabel}
          rightElement="text"
          rightValue={locationSharingMode === 'always' ? 'Always' : locationSharingMode === 'alerts_only' ? 'SOS Only' : 'Off'}
          onPress={() => setLocationSharingMode(nextLocationMode)}
        />
        <SettingRow
          icon="shield"
          title="Danger Zone Warnings"
          subtitle="Tap to cycle alert distance"
          rightElement="text"
          rightValue={`${dangerZoneWarningDistance}m`}
          onPress={() => setDangerZoneWarningDistance(nextWarningDistance)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SAFETY TRIGGERS</Text>
        <SettingRow
          icon="notifications"
          title="Priority Alerts"
          subtitle={priorityAlerts ? 'Nearby emergency alerts are active' : 'Nearby emergency alerts are paused'}
          rightElement="toggle"
          rightValue={priorityAlerts}
          onToggle={setPriorityAlerts}
        />
        <SettingRow
          icon="phone-portrait"
          title="Shake to SOS"
          subtitle={shakeToSOS ? 'Shake detection is active' : 'Shake detection is off'}
          rightElement="toggle"
          rightValue={shakeToSOS}
          onToggle={setShakeToSOS}
        />
      </View>

      <View style={styles.footer}>
        <Button
          variant="outline"
          size="medium"
          fullWidth
          onPress={logOut}
          textStyle={{ color: colors.error }}
          style={styles.logoutButton}
        >
          Sign Out of Network
        </Button>
        <Text style={styles.versionText}>SafeAround - Secure Connection</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  securityStatusCard: {
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: 'rgba(30, 142, 62, 0.05)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(30, 142, 62, 0.2)',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.secondary,
    marginLeft: spacing.sm,
  },
  statusSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 28,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    letterSpacing: 1,
  },
  footer: {
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  logoutButton: {
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
  },
  versionText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    fontWeight: '600',
  },
});
