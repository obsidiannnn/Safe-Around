import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { Text, TextInput, Button, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { colors } from '@/theme/colors';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

export const EditProfileScreen = () => {
  const navigation = useNavigation();
  const { user, updateProfile } = useAuthStore();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateProfile({ name, email } as any);
      navigation.goBack();
    } catch (error) {
      console.error('Update Profile Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Button 
          icon="arrow-left" 
          onPress={() => navigation.goBack()}
          textColor={colors.textPrimary}
        >
          Back
        </Button>
        <Text style={styles.headerTitle}>Edit Secure Profile</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.avatarSection}>
            <Avatar.Text 
              size={80} 
              label={name.substring(0, 2).toUpperCase() || 'U'} 
              style={styles.avatar} 
            />
            <Button mode="text" onPress={() => {}} textColor={colors.primary}>
              Change Photo
            </Button>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                value={name}
                mode="outlined"
                onChangeText={setName}
                placeholder="Ex: John Doe"
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                style={styles.input}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                value={email}
                mode="outlined"
                onChangeText={setEmail}
                placeholder="Ex: john@example.com"
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                keyboardType="email-address"
                style={styles.input}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                value={phone}
                mode="outlined"
                onChangeText={setPhone}
                placeholder="Ex: +1234567890"
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                keyboardType="phone-pad"
                disabled={true} // Usually phone is the unique identifier
                style={styles.input}
              />
              <Text style={styles.helperText}>Verifed Phone Number can't be changed</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Button
              mode="contained"
              onPress={handleSave}
              loading={loading}
              style={styles.saveButton}
              labelStyle={styles.saveButtonLabel}
            >
              Save Secure Changes
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    backgroundColor: 'rgba(26, 115, 232, 0.1)',
  },
  form: {
    gap: spacing.lg,
  },
  inputContainer: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: 4,
  },
  input: {
    backgroundColor: colors.surface,
  },
  helperText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  footer: {
    marginTop: spacing.xl * 2,
    marginBottom: spacing.xl,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 6,
    ...shadows.medium,
  },
  saveButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
