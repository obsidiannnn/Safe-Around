import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Button, Card, Input, Avatar } from '@/components/common';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

interface Responder {
  id: string;
  name: string;
  avatar?: string;
  rating?: number;
}

/**
 * Emergency resolution screen shown after alert is resolved
 * Allows rating experience and viewing incident report
 */
export const EmergencyResolutionScreen = () => {
  const navigation = useNavigation();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [wasHelpful, setWasHelpful] = useState<boolean | null>(null);

  const alertDuration = '3:45'; // Mock data
  const responders: Responder[] = [
    { id: '1', name: 'Sarah K.', rating: 5 },
    { id: '2', name: 'Mike T.', rating: 5 },
  ];

  const handleSubmitRating = () => {
    // TODO: Submit rating to API
    console.log('Rating submitted:', { rating, feedback, wasHelpful });
    navigation.navigate('Map' as never);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Icon name="check-circle" size={80} color={colors.success} />
        </View>
        <Text style={styles.title}>You're Safe!</Text>
        <Text style={styles.subtitle}>Emergency alert has been resolved</Text>
      </View>

      <Card variant="elevated" padding="lg" style={styles.summaryCard}>
        <Text style={styles.cardTitle}>Alert Summary</Text>

        <View style={styles.summaryRow}>
          <Icon name="schedule" size={20} color={colors.textSecondary} />
          <Text style={styles.summaryLabel}>Duration</Text>
          <Text style={styles.summaryValue}>{alertDuration}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Icon name="people" size={20} color={colors.textSecondary} />
          <Text style={styles.summaryLabel}>Responders</Text>
          <Text style={styles.summaryValue}>{responders.length}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Icon name="local-police" size={20} color={colors.textSecondary} />
          <Text style={styles.summaryLabel}>Emergency Services</Text>
          <Text style={styles.summaryValue}>Not contacted</Text>
        </View>
      </Card>

      {responders.length > 0 && (
        <Card variant="elevated" padding="lg" style={styles.respondersCard}>
          <Text style={styles.cardTitle}>Responders Who Helped</Text>
          {responders.map((responder) => (
            <View key={responder.id} style={styles.responderItem}>
              <Avatar name={responder.name} size="medium" />
              <View style={styles.responderInfo}>
                <Text style={styles.responderName}>{responder.name}</Text>
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Icon
                      key={star}
                      name="star"
                      size={16}
                      color={star <= (responder.rating || 0) ? '#FDD835' : colors.border}
                    />
                  ))}
                </View>
              </View>
            </View>
          ))}
        </Card>
      )}

      <Card variant="elevated" padding="lg" style={styles.ratingCard}>
        <Text style={styles.cardTitle}>Rate Your Experience</Text>

        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Icon
              key={star}
              name={star <= rating ? 'star' : 'star-border'}
              size={40}
              color={star <= rating ? '#FDD835' : colors.border}
              onPress={() => setRating(star)}
            />
          ))}
        </View>

        <Input
          value={feedback}
          onChangeText={setFeedback}
          placeholder="Share your feedback (optional)"
          maxLength={500}
          showCounter
        />

        <Text style={styles.helpfulQuestion}>Was the response helpful?</Text>
        <View style={styles.helpfulButtons}>
          <Button
            variant={wasHelpful === true ? 'primary' : 'outline'}
            size="medium"
            onPress={() => setWasHelpful(true)}
            style={styles.helpfulButton}
          >
            Yes
          </Button>
          <Button
            variant={wasHelpful === false ? 'primary' : 'outline'}
            size="medium"
            onPress={() => setWasHelpful(false)}
            style={styles.helpfulButton}
          >
            No
          </Button>
        </View>
      </Card>

      <View style={styles.actions}>
        <Button
          variant="outline"
          size="large"
          fullWidth
          icon="description"
          onPress={() => console.log('View incident report')}
          style={styles.actionButton}
        >
          View Incident Report
        </Button>

        <Button
          variant="primary"
          size="large"
          fullWidth
          onPress={handleSubmitRating}
          disabled={rating === 0}
        >
          Submit & Close
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
  content: {
    padding: spacing['2xl'],
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing['2xl'],
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSizes['3xl'],
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  summaryCard: {
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryLabel: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginLeft: spacing.md,
  },
  summaryValue: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  respondersCard: {
    marginBottom: spacing.lg,
  },
  responderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  responderInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  responderName: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingCard: {
    marginBottom: spacing.lg,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  helpfulQuestion: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  helpfulButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  helpfulButton: {
    flex: 1,
  },
  actions: {
    marginTop: spacing.lg,
  },
  actionButton: {
    marginBottom: spacing.md,
  },
});
