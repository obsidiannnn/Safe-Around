import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Pressable, Text, KeyboardTypeOptions, ViewStyle, TextStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '@/theme/colors';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

type InputType = 'text' | 'email' | 'phone' | 'password';
type ValidationState = 'default' | 'error' | 'success';

interface InputProps {
  type?: InputType;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  leftIcon?: string;
  rightIcon?: string;
  maxLength?: number;
  showCounter?: boolean;
  autoFocus?: boolean;
  validationState?: ValidationState;
  disabled?: boolean;
  keyboardType?: KeyboardTypeOptions;
  style?: ViewStyle | ViewStyle[];
  inputStyle?: TextStyle | TextStyle[];
}

/**
 * Reusable input component with validation states and icons
 * Supports password visibility toggle and character counter
 */
export const Input: React.FC<InputProps> = ({
  type = 'text',
  value,
  onChangeText,
  placeholder,
  label,
  error,
  leftIcon,
  rightIcon,
  maxLength,
  showCounter = false,
  autoFocus = false,
  validationState = 'default',
  disabled = false,
  keyboardType,
  style,
  inputStyle,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isPassword = type === 'password';
  const secureTextEntry = isPassword && !isPasswordVisible;

  const getBorderColor = () => {
    if (error || validationState === 'error') return colors.error;
    if (validationState === 'success') return colors.success;
    if (isFocused) return colors.primary;
    return colors.border;
  };

  const getKeyboardType = () => {
    switch (type) {
      case 'email':
        return 'email-address';
      case 'phone':
        return 'phone-pad';
      default:
        return 'default';
    }
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          { borderColor: getBorderColor() },
          disabled && styles.disabledContainer,
        ]}
      >
        {leftIcon && (
          <Icon name={leftIcon} size={20} color={colors.textSecondary} style={styles.leftIcon} />
        )}
        
        <TextInput
          style={[styles.input, leftIcon && styles.inputWithLeftIcon, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType || getKeyboardType()}
          autoCapitalize={type === 'email' ? 'none' : 'sentences'}
          autoCorrect={false}
          maxLength={maxLength}
          autoFocus={autoFocus}
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          accessibilityLabel={label || placeholder}
        />
        
        {isPassword && (
          <Pressable onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.rightIcon}>
            <Icon
              name={isPasswordVisible ? 'visibility' : 'visibility-off'}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        )}
        
        {!isPassword && rightIcon && (
          <Icon name={rightIcon} size={20} color={colors.textSecondary} style={styles.rightIcon} />
        )}
      </View>
      
      <View style={styles.footer}>
        {error && <Text style={styles.errorText}>{error}</Text>}
        {showCounter && maxLength && (
          <Text style={styles.counterText}>
            {value.length}/{maxLength}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    minHeight: 52,
    ...shadows.small,
  },
  inputFocused: {
    backgroundColor: '#FFFDFD',
  },
  disabledContainer: {
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
  },
  inputWithLeftIcon: {
    marginLeft: spacing.sm,
  },
  leftIcon: {
    marginRight: 0,
  },
  rightIcon: {
    marginLeft: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  errorText: {
    fontSize: fontSizes.xs,
    color: colors.error,
  },
  counterText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
});
