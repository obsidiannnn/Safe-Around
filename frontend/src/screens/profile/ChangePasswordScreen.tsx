import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input } from '@/components/common';
import { authService } from '@/services/api/authService';
import { changePasswordSchema, ChangePasswordFormData } from '@/utils/validation';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';

export const ChangePasswordScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const currentPassword = watch('currentPassword');
  const newPassword = watch('newPassword');
  const confirmPassword = watch('confirmPassword');

  const passwordChecks = [
    { label: 'At least 8 characters', passed: newPassword.length >= 8 },
    { label: 'Contains one uppercase letter', passed: /[A-Z]/.test(newPassword) },
    { label: 'Contains one number', passed: /[0-9]/.test(newPassword) },
    { label: 'Different from current password', passed: !!newPassword && newPassword !== currentPassword },
    { label: 'Confirmation matches', passed: !!confirmPassword && newPassword === confirmPassword },
  ];

  const onSubmit = async (data: ChangePasswordFormData) => {
    try {
      setLoading(true);
      await authService.changePassword({
        current_password: data.currentPassword,
        new_password: data.newPassword,
      });
      reset();
      Alert.alert('Password updated', 'Your password was changed successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Could not change password', error.response?.data?.error || 'Please check your current password and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Icon name="arrow-back" size={24} color={colors.textPrimary} onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.infoCard}>
            <Icon name="lock" size={22} color={colors.primary} />
            <Text style={styles.infoText}>
              We verify your current password before saving a new one. Reusing the same password is not allowed.
            </Text>
          </View>

          <Controller
            control={control}
            name="currentPassword"
            render={({ field: { onChange, value } }) => (
              <Input
                type="password"
                label="Current Password"
                value={value}
                onChangeText={onChange}
                placeholder="Enter current password"
                error={errors.currentPassword?.message}
                leftIcon="lock-outline"
              />
            )}
          />

          <Controller
            control={control}
            name="newPassword"
            render={({ field: { onChange, value } }) => (
              <Input
                type="password"
                label="New Password"
                value={value}
                onChangeText={onChange}
                placeholder="Enter new password"
                error={errors.newPassword?.message}
                leftIcon="vpn-key"
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, value } }) => (
              <Input
                type="password"
                label="Confirm New Password"
                value={value}
                onChangeText={onChange}
                placeholder="Re-enter new password"
                error={errors.confirmPassword?.message}
                leftIcon="done"
              />
            )}
          />

          <View style={styles.checklistCard}>
            <Text style={styles.checklistTitle}>Password requirements</Text>
            {passwordChecks.map((item) => (
              <View key={item.label} style={styles.checkRow}>
                <Icon
                  name={item.passed ? 'check-circle' : 'radio-button-unchecked'}
                  size={18}
                  color={item.passed ? colors.success : colors.textSecondary}
                />
                <Text style={[styles.checkText, item.passed && styles.checkTextPassed]}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>

          <Button fullWidth size="large" loading={loading} disabled={loading} onPress={handleSubmit(onSubmit)}>
            Update Password
          </Button>
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
  flex: {
    flex: 1,
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
    padding: spacing.lg,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {
    flex: 1,
    marginLeft: spacing.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  checklistCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  checklistTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  checkText: {
    marginLeft: spacing.sm,
    color: colors.textSecondary,
  },
  checkTextPassed: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
