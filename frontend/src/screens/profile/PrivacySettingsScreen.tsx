import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SettingRow } from '@/components/profile/SettingRow';
import { useSettingsStore } from '@/store/settingsStore';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export const PrivacySettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const {
    locationSharingMode,
    dangerZoneWarningDistance,
    setLocationSharingMode,
    setDangerZoneWarningDistance,
  } = useSettingsStore();
  const nextLocationMode = locationSharingMode === 'always' ? 'alerts_only' : locationSharingMode === 'alerts_only' ? 'never' : 'always';
  const nextWarningDistance = dangerZoneWarningDistance === 250 ? 500 : dangerZoneWarningDistance === 500 ? 1000 : 250;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Icon name="arrow-back" size={24} color={colors.textPrimary} onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Privacy Controls</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>LOCATION SHARING</Text>
        <SettingRow
          icon="location"
          title="Live Location Sharing"
          subtitle="Controls when your location syncs to backend services"
          rightElement="text"
          rightValue={locationSharingMode === 'always' ? 'Always' : locationSharingMode === 'alerts_only' ? 'SOS Only' : 'Off'}
          onPress={() => setLocationSharingMode(nextLocationMode)}
        />
        <SettingRow
          icon="shield"
          title="Danger Zone Warning Distance"
          subtitle="Controls local danger-zone warning radius"
          rightElement="text"
          rightValue={`${dangerZoneWarningDistance}m`}
          onPress={() => setDangerZoneWarningDistance(nextWarningDistance)}
        />

        <View style={styles.note}>
          <Text style={styles.noteText}>
            Map positioning still works locally. These controls determine when SafeAround shares location updates with backend services.
          </Text>
        </View>
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    letterSpacing: 1,
  },
  note: {
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteText: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
