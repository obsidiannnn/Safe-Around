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

export const NotificationSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const {
    priorityAlerts,
    shakeToSOS,
    setPriorityAlerts,
    setShakeToSOS,
  } = useSettingsStore();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Icon name="arrow-back" size={24} color={colors.textPrimary} onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Alerts & Triggers</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
});
