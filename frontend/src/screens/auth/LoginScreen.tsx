import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, Checkbox } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Alert } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { loginSchema, LoginFormData } from '@/utils/validation';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

/**
 * Login screen with phone/email and password authentication
 */
export const LoginScreen = () => {
  const navigation = useNavigation();
  const { logIn, error, clearError } = useAuth();
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsSubmitting(true);
      clearError();
      await logIn(data);
      // Navigation handled by AppNavigator based on auth state
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
          <Text style={styles.logo}>🛡️</Text>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue to SafeAround</Text>
        </View>

        {error && (
          <Alert type="error" message={error} onDismiss={clearError} />
        )}

        <View style={styles.form}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <Input
                type="email"
                label="Email or Phone"
                value={value}
                onChangeText={onChange}
                placeholder="Enter your email or phone"
                error={errors.email?.message}
                leftIcon="person"
                autoFocus
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <Input
                type="password"
                label="Password"
                value={value}
                onChangeText={onChange}
                placeholder="Enter your password"
                error={errors.password?.message}
                leftIcon="lock"
              />
            )}
          />

          <View style={styles.options}>
            <View style={styles.rememberMe}>
              <Checkbox
                status={rememberMe ? 'checked' : 'unchecked'}
                onPress={() => setRememberMe(!rememberMe)}
                color={colors.primary}
              />
              <Text style={styles.rememberMeText}>Remember me</Text>
            </View>

            <Text
              style={styles.forgotPassword}
              onPress={() => navigation.navigate('PasswordReset' as never)}
            >
              Forgot Password?
            </Text>
          </View>

          <Button
            variant="primary"
            size="large"
            fullWidth
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
          >
            Sign In
          </Button>

          <View style={styles.signUpContainer}>
            <Text style={styles.signUpText}>Don't have an account? </Text>
            <Text
              style={styles.signUpLink}
              onPress={() => navigation.navigate('Signup' as never)}
            >
              Sign Up
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
    alignItems: 'center',
    marginTop: spacing['4xl'],
    marginBottom: spacing['3xl'],
  },
  logo: {
    fontSize: 64,
    marginBottom: spacing.md,
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
  form: {
    marginBottom: spacing['2xl'],
  },
  options: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberMeText: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  forgotPassword: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  signUpText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  signUpLink: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: '600',
  },
});
