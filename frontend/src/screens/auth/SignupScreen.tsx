import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Text, Checkbox } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Alert } from '@/components/common';
import { PhoneInput } from '@/components/forms';
import { useAuth } from '@/hooks/useAuth';
import { registerSchema, RegisterFormData } from '@/utils/validation';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

/**
 * Sign up screen with form validation and password strength indicator
 */
export const SignupScreen = () => {
  const navigation = useNavigation();
  const { signUp, error, clearError } = useAuth();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
  });

  const password = watch('password');

  const getPasswordStrength = (pwd: string): { strength: string; color: string } => {
    if (!pwd) return { strength: '', color: colors.textSecondary };
    if (pwd.length < 8) return { strength: 'Weak', color: colors.error };
    
    const hasUpper = /[A-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[!@#$%^&*]/.test(pwd);
    
    const score = [hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    
    if (score === 3 && pwd.length >= 12) return { strength: 'Strong', color: colors.success };
    if (score >= 2) return { strength: 'Medium', color: colors.warning };
    return { strength: 'Weak', color: colors.error };
  };

  const passwordStrength = getPasswordStrength(password);

  const onSubmit = async (data: RegisterFormData) => {
    if (!acceptedTerms) {
      return;
    }

    try {
      setIsSubmitting(true);
      await signUp(data);
      navigation.navigate('Permissions' as never);
    } catch (err) {
      // Error is handled by store
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join SafeAround to protect yourself and your loved ones</Text>
        </View>

        {error && (
          <Alert type="error" message={error} onDismiss={clearError} />
        )}

        <View style={styles.form}>
          <Controller
            control={control}
            name="phoneNumber"
            render={({ field: { onChange, value } }) => (
              <PhoneInput
                label="Phone Number"
                value={value}
                onChangeText={onChange}
                error={errors.phoneNumber?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="firstName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="First Name"
                value={value}
                onChangeText={onChange}
                placeholder="John"
                error={errors.firstName?.message}
                leftIcon="person"
              />
            )}
          />

          <Controller
            control={control}
            name="lastName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Last Name"
                value={value}
                onChangeText={onChange}
                placeholder="Doe"
                error={errors.lastName?.message}
                leftIcon="person"
              />
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                type="email"
                label="Email (Optional)"
                value={value}
                onChangeText={onChange}
                placeholder="john.doe@example.com"
                error={errors.email?.message}
                leftIcon="email"
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <Input
                  type="password"
                  label="Password"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Enter password"
                  error={errors.password?.message}
                  leftIcon="lock"
                />
                {password && (
                  <Text style={[styles.passwordStrength, { color: passwordStrength.color }]}>
                    Strength: {passwordStrength.strength}
                  </Text>
                )}
              </View>
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                type="password"
                label="Confirm Password"
                value={value}
                onChangeText={onChange}
                placeholder="Re-enter password"
                error={errors.confirmPassword?.message}
                leftIcon="lock"
              />
            )}
          />

          <View style={styles.termsContainer}>
            <Checkbox
              status={acceptedTerms ? 'checked' : 'unchecked'}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
              color={colors.primary}
            />
            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text style={styles.termsLink}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </View>

          <Button
            variant="primary"
            size="large"
            fullWidth
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            disabled={!acceptedTerms}
          >
            Sign Up
          </Button>

          <View style={styles.signInContainer}>
            <Text style={styles.signInText}>Already have an account? </Text>
            <Text
              style={styles.signInLink}
              onPress={() => navigation.navigate('Login' as never)}
            >
              Sign In
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing['2xl'],
  },
  header: {
    marginTop: spacing['2xl'],
    marginBottom: spacing['3xl'],
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
  form: {
    marginBottom: spacing['2xl'],
  },
  passwordStrength: {
    fontSize: fontSizes.xs,
    marginTop: -spacing.md,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  termsText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  signInText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  signInLink: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: '600',
  },
});
