import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { theme } from '@/theme';

const helpItems = [
  { title: 'How to trigger an emergency alert?', desc: 'Press and hold the SOS button for 3 seconds. Your emergency contacts will be notified immediately.' },
  { title: 'How to add emergency contacts?', desc: 'Go to the Contacts tab and tap the "+" button to add a trusted contact.' },
  { title: 'How does location sharing work?', desc: 'When you trigger an alert, your live location is shared with your emergency contacts in real-time.' },
  { title: 'How to reset my password?', desc: 'Go to Login screen → Forgot Password. Enter your phone number to receive an OTP and reset your password.' },
  { title: 'How to disable notifications?', desc: 'Go to Settings tab and toggle off the notification preferences you want to disable.' },
];

export const HelpTab: React.FC = () => {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
      {helpItems.map((item, idx) => (
        <TouchableOpacity key={idx} style={styles.card}>
          <Text style={styles.question}>{item.title}</Text>
          <Text style={styles.answer}>{item.desc}</Text>
        </TouchableOpacity>
      ))}

      <View style={styles.contactSupport}>
        <Text style={styles.supportTitle}>Need more help?</Text>
        <Text style={styles.supportText}>Contact us at support@safearound.app</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.lg },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  question: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  answer: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  contactSupport: {
    marginTop: theme.spacing.xl,
    alignItems: 'center',
    paddingBottom: theme.spacing['2xl'],
  },
  supportTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  supportText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
  },
});
