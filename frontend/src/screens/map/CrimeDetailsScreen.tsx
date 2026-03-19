import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Button, Card } from '@/components/common';
import { Crime } from '@/types/models';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';
import { formatDateTime } from '@/utils/formatters';

/**
 * Crime details screen showing incident information
 * Allows reporting inaccuracies and sharing warnings
 */
export const CrimeDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  // const crime = route.params?.crime as Crime; // Would come from navigation params

  // Mock data for now
  const crime: Crime = {
    id: '1',
    type: 'Theft',
    severity: 'high',
    location: { latitude: 37.78825, longitude: -122.4324 },
    description: 'Vehicle break-in reported',
    date: new Date().toISOString(),
    source: 'police',
    verified: true,
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return colors.error;
      case 'high':
        return colors.warning;
      case 'medium':
        return '#FDD835';
      case 'low':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  const getCrimeIcon = (type: string): string => {
    const iconMap: Record<string, string> = {
      Theft: 'local-police',
      Assault: 'warning',
      Robbery: 'report',
      Vandalism: 'broken-image',
      Burglary: 'home',
    };
    return iconMap[type] || 'report';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Incident Details</Text>
      </View>

      <Card variant="elevated" padding="lg" style={styles.card}>
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: `${getSeverityColor(crime.severity)}20` }]}>
            <Icon name={getCrimeIcon(crime.type)} size={40} color={getSeverityColor(crime.severity)} />
          </View>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Type</Text>
          <Text style={styles.value}>{crime.type}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Severity</Text>
          <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(crime.severity) }]}>
            <Text style={styles.severityText}>{crime.severity.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Date & Time</Text>
          <Text style={styles.value}>{formatDateTime(crime.date)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Source</Text>
          <View style={styles.sourceContainer}>
            <Icon
              name={crime.source === 'police' ? 'verified' : 'person'}
              size={16}
              color={crime.verified ? colors.success : colors.textSecondary}
            />
            <Text style={styles.value}>
              {crime.source === 'police' ? 'Police Report' : 'User Report'}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Location</Text>
          <Text style={styles.value}>
            {crime.location.latitude.toFixed(6)}, {crime.location.longitude.toFixed(6)}
          </Text>
        </View>

        <View style={styles.descriptionContainer}>
          <Text style={styles.label}>Description</Text>
          <Text style={styles.description}>{crime.description}</Text>
        </View>
      </Card>

      <View style={styles.actions}>
        <Button
          variant="outline"
          size="large"
          fullWidth
          icon="block"
          onPress={() => console.log('Avoid this area')}
          style={styles.actionButton}
        >
          Avoid This Area
        </Button>

        <Button
          variant="outline"
          size="large"
          fullWidth
          icon="flag"
          onPress={() => console.log('Report inaccurate')}
          style={styles.actionButton}
        >
          Report Inaccurate
        </Button>

        <Button
          variant="primary"
          size="large"
          fullWidth
          icon="share"
          onPress={() => console.log('Share warning')}
        >
          Share Warning
        </Button>
      </View>
    </ScrollView>
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
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  backButton: {
    marginRight: spacing.md,
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  card: {
    margin: spacing.lg,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  value: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  severityBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xs,
  },
  severityText: {
    fontSize: fontSizes.xs,
    color: colors.surface,
    fontWeight: '700',
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  descriptionContainer: {
    marginTop: spacing.lg,
  },
  description: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  actions: {
    padding: spacing.lg,
  },
  actionButton: {
    marginBottom: spacing.md,
  },
});
