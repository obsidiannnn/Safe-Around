import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/theme';
import { format } from 'date-fns';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  messageType: 'text' | 'location';
  timestamp: number;
  status: 'sending' | 'sent' | 'read';
  location?: { latitude: number; longitude: number };
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onLongPress?: () => void;
  onNavigateToLocation?: (location: { latitude: number; longitude: number }) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  onLongPress,
  onNavigateToLocation,
}) => {
  const getStatusIcon = () => {
    if (!isOwn) return null;
    switch (message.status) {
      case 'sending':
        return <Ionicons name="time-outline" size={12} color={theme.colors.textSecondary} />;
      case 'sent':
        return <Ionicons name="checkmark" size={12} color={theme.colors.textSecondary} />;
      case 'read':
        return <Ionicons name="checkmark-done" size={12} color={theme.colors.secondary} />;
    }
  };

  return (
    <Pressable
      style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}
      onLongPress={onLongPress}
    >
      {!isOwn && <Text style={styles.senderName}>{message.senderName}</Text>}
      
      {message.messageType === 'text' ? (
        <Text style={[styles.message, isOwn ? styles.ownMessage : styles.otherMessage]}>
          {message.message}
        </Text>
      ) : (
        <View style={styles.locationContainer}>
          <Ionicons name="location" size={20} color={theme.colors.primary} />
          <Text style={styles.locationText}>Location shared</Text>
          {onNavigateToLocation && message.location && (
            <TouchableOpacity
              style={styles.navigateButton}
              onPress={() => onNavigateToLocation(message.location!)}
            >
              <Text style={styles.navigateText}>Navigate</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.timestamp}>
          {format(message.timestamp, 'HH:mm')}
        </Text>
        {getStatusIcon()}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    maxWidth: '75%',
    marginVertical: theme.spacing.xs,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  ownContainer: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.secondary,
  },
  otherContainer: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surface,
  },
  senderName: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  message: {
    fontSize: theme.typography.sizes.md,
  },
  ownMessage: {
    color: '#fff',
  },
  otherMessage: {
    color: theme.colors.text,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  locationText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
  },
  navigateButton: {
    marginLeft: 'auto',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
  },
  navigateText: {
    fontSize: theme.typography.sizes.xs,
    color: '#fff',
    fontWeight: theme.typography.weights.bold,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  timestamp: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
  },
});
