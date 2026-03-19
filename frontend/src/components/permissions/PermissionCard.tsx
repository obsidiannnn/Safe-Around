import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/common/Button';
import { theme } from '@/theme';

interface PermissionCardProps {
  icon: string;
  name: string;
  description: string;
  status: 'granted' | 'denied' | 'not_asked';
  critical: boolean;
  onRequest: () => void;
  onExplain?: () => void;
}

export const PermissionCard: React.FC<PermissionCardProps> = ({
  icon,
  name,
  description,
  status,
  critical,
  onRequest,
  onExplain,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'granted':
        return theme.colors.success;
      case 'denied':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'granted':
        return 'Granted';
      case 'denied':
        return 'Denied';
      default:
        return 'Not Asked';
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: `${getStatusColor()}20` }]}>
        <Ionicons name={icon as any} size={40} color={getStatusColor()} />
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{name}</Text>
          {critical && (
            <View style={styles.criticalBadge}>
              <Text style={styles.criticalText}>Required</Text>
            </View>
          )}
        </View>

        <Text style={styles.description}>{description}</Text>

        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}20` }]}>
          <Ionicons
            name={status === 'granted' ? 'checkmark-circle' : 'alert-circle'}
            size={16}
            color={getStatusColor()}
          />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>

        {onExplain && (
          <TouchableOpacity style={styles.explainButton} onPress={onExplain}>
            <Text style={styles.explainText}>Why we need this</Text>
            <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        )}

        {status !== 'granted' && (
          <Button
            variant={critical ? 'primary' : 'outline'}
            onPress={onRequest}
            style={styles.actionButton}
          >
            {status === 'denied' ? 'Open Settings' : critical ? 'Allow' : 'Allow (Optional)'}
          </Button>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  name: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    flex: 1,
  },
  criticalBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius.sm,
  },
  criticalText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  description: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  statusText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.medium,
  },
  explainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  explainText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
  },
  actionButton: {
    marginTop: theme.spacing.xs,
  },
});
