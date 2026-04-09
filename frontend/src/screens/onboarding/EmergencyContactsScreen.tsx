import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert as RNAlert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Checkbox } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Card, ListItem, Alert } from '@/components/common';
import { PhoneInput } from '@/components/forms';
import { emergencyContactSchema, EmergencyContactFormData } from '@/utils/validation';
import { EmergencyContact } from '@/types/models';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';
import { profileApiService } from '@/services/api/profileApiService';

/**
 * Emergency contacts setup screen
 * Allows adding 1-5 emergency contacts during onboarding
 */
export const EmergencyContactsScreen = () => {
  const navigation = useNavigation();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isPrimary, setIsPrimary] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmergencyContactFormData>({
    resolver: zodResolver(emergencyContactSchema),
  });

  const onAddContact = (data: EmergencyContactFormData) => {
    if (contacts.length >= 5) {
      return;
    }

    const newContact: EmergencyContact = {
      id: Date.now(),
      userId: 0,
      name: data.name,
      phoneNumber: data.phone,
      phone: data.phone,
      relationship: data.relationship,
      isPrimary: contacts.length === 0 ? true : isPrimary,
      createdAt: new Date().toISOString(),
    };

    setContacts([...contacts, newContact]);
    setShowForm(false);
    setIsPrimary(false);
    reset();
  };

  const removeContact = (contactId: number) => {
    setContacts(contacts.filter((c) => c.id !== contactId));
  };

  const handleContinue = async () => {
    try {
      // Save contacts to backend
      for (const contact of contacts) {
        await profileApiService.addContact({
          name: contact.name,
          phone: contact.phoneNumber,
          relationship: contact.relationship,
          is_priority: contact.isPrimary,
        });
      }
      navigation.navigate('OnboardingTutorial' as never);
    } catch (error) {
      console.error('Failed to save contacts:', error);
      RNAlert.alert('Error', 'Failed to save emergency contacts. Please try again.');
    }
  };

  const handleSkip = () => {
    navigation.navigate('OnboardingTutorial' as never);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
        <Text style={styles.title}>Emergency Contacts</Text>
        <Text style={styles.subtitle}>
          Add trusted contacts who will be notified during emergencies (1-5 contacts)
        </Text>
      </View>

        {contacts.length === 0 && !showForm && (
          <Alert
            type="info"
            message="Add at least one emergency contact to continue"
          />
        )}

        {contacts.map((contact) => (
        <Card key={contact.id} variant="outlined" padding="md" style={styles.contactCard}>
          <ListItem
            title={contact.name}
            subtitle={`${contact.relationship} • ${contact.phoneNumber}`}
            leftIcon="person"
            rightComponent={
              contact.isPrimary ? (
                <Text style={styles.primaryBadge}>Primary</Text>
              ) : undefined
            }
            swipeActions={{
              right: {
                icon: 'delete',
                color: colors.error,
                onPress: () => removeContact(contact.id),
              },
            }}
          />
        </Card>
      ))}

        {showForm && (
        <Card variant="elevated" padding="lg" style={styles.formCard}>
          <Text style={styles.formTitle}>Add Emergency Contact</Text>

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Full Name"
                value={value}
                onChangeText={onChange}
                placeholder="John Doe"
                error={errors.name?.message}
                leftIcon="person"
                autoFocus
              />
            )}
          />

          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, value } }) => (
              <PhoneInput
                label="Phone Number"
                value={value}
                onChangeText={onChange}
                error={errors.phone?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="relationship"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Relationship"
                value={value}
                onChangeText={onChange}
                placeholder="e.g., Mother, Friend, Spouse"
                error={errors.relationship?.message}
                leftIcon="people"
              />
            )}
          />

          {contacts.length > 0 && (
            <View style={styles.primaryContainer}>
              <Checkbox
                status={isPrimary ? 'checked' : 'unchecked'}
                onPress={() => setIsPrimary(!isPrimary)}
                color={colors.primary}
              />
              <Text style={styles.primaryText}>Mark as primary contact</Text>
            </View>
          )}

          <View style={styles.formActions}>
            <Button
              variant="outline"
              size="medium"
              onPress={() => {
                setShowForm(false);
                reset();
              }}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="medium"
              onPress={handleSubmit(onAddContact)}
              style={styles.saveButton}
            >
              Save Contact
            </Button>
          </View>
        </Card>
      )}

        {!showForm && contacts.length < 5 && (
        <Button
          variant="outline"
          size="large"
          fullWidth
          icon="add"
          onPress={() => setShowForm(true)}
          style={styles.addButton}
        >
          Add Contact
        </Button>
      )}

        <View style={styles.footer}>
        <Button
          variant="primary"
          size="large"
          fullWidth
          onPress={handleContinue}
          disabled={contacts.length === 0}
        >
          Save & Continue
        </Button>

        <Button
          variant="ghost"
          size="medium"
          fullWidth
          onPress={handleSkip}
        >
          Skip for now
        </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing['2xl'],
    paddingBottom: spacing['4xl'],
  },
  header: {
    marginTop: spacing.xl,
    marginBottom: spacing['2xl'],
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
    lineHeight: 22,
  },
  contactCard: {
    marginBottom: spacing.md,
  },
  primaryBadge: {
    fontSize: fontSizes.xs,
    color: colors.primary,
    fontWeight: '600',
    backgroundColor: `${colors.primary}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
  },
  formCard: {
    marginBottom: spacing.lg,
  },
  formTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  primaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  primaryText: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  addButton: {
    marginBottom: spacing.xl,
  },
  footer: {
    marginTop: spacing.xl,
  },
});
