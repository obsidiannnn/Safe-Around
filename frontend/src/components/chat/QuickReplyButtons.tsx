import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/theme';

interface QuickReply {
  id: string;
  text: string;
  icon: string;
}

interface QuickReplyButtonsProps {
  onSelect: (text: string) => void;
}

const defaultReplies: QuickReply[] = [
  { id: '1', text: "I'm here", icon: 'location' },
  { id: '2', text: 'On my way', icon: 'car' },
  { id: '3', text: '2 minutes away', icon: 'time' },
  { id: '4', text: 'Can you see me?', icon: 'eye' },
  { id: '5', text: 'Call me', icon: 'call' },
];

export const QuickReplyButtons: React.FC<QuickReplyButtonsProps> = ({ onSelect }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {defaultReplies.map((reply) => (
        <TouchableOpacity
          key={reply.id}
          style={styles.button}
          onPress={() => onSelect(reply.text)}
          accessibilityLabel={`Quick reply: ${reply.text}`}
          accessibilityRole="button"
        >
          <Ionicons name={reply.icon as any} size={16} color={theme.colors.primary} />
          <Text style={styles.text}>{reply.text}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: 50,
  },
  content: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  text: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
  },
});
