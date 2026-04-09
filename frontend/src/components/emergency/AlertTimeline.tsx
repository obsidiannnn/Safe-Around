import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';
import { formatTimeAgo } from '@/utils/formatters';

interface TimelineEvent {
  id: string;
  type: 'created' | 'radius-expanded' | 'responder-accepted' | 'emergency-services' | 'resolved';
  title: string;
  description?: string;
  timestamp: string;
  status: 'completed' | 'in-progress' | 'pending';
}

interface AlertTimelineProps {
  events: TimelineEvent[];
}

/**
 * Vertical timeline showing alert progression
 * Color-coded by status with icons
 */
export const AlertTimeline: React.FC<AlertTimelineProps> = ({ events }) => {
  const getIcon = (type: string): string => {
    switch (type) {
      case 'created':
        return 'warning';
      case 'radius-expanded':
        return 'radar';
      case 'responder-accepted':
        return 'person-add';
      case 'emergency-services':
        return 'local-police';
      case 'resolved':
        return 'check-circle';
      default:
        return 'circle';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'in-progress':
        return colors.warning;
      case 'pending':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      {events.map((event, index) => (
        <View key={event.id} style={styles.eventItem}>
          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, { backgroundColor: `${getStatusColor(event.status)}20` }]}>
              <Icon name={getIcon(event.type) as any} size={20} color={getStatusColor(event.status)} />
            </View>
            {index < events.length - 1 && (
              <View style={[styles.line, { backgroundColor: getStatusColor(event.status) }]} />
            )}
          </View>

          <View style={styles.eventContent}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            {event.description && (
              <Text style={styles.eventDescription}>{event.description}</Text>
            )}
            <Text style={styles.eventTime}>{formatTimeAgo(event.timestamp)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
  },
  eventItem: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  iconContainer: {
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: spacing.xs,
  },
  eventContent: {
    flex: 1,
    paddingTop: spacing.sm,
  },
  eventTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  eventDescription: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  eventTime: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
});
