import { MD3LightTheme as DefaultTheme } from 'react-native-paper';
import { colors } from './colors';
import { spacing, borderRadius, shadows } from './spacing';
import { typography } from './typography';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    secondary: colors.secondary,
    error: colors.error,
    background: colors.background,
    surface: colors.surface,
    onSurface: colors.textPrimary,
    onSurfaceVariant: colors.textSecondary,
    border: colors.border,
    text: colors.textPrimary,
    textSecondary: colors.textSecondary,
    disabled: colors.disabled,
    backdrop: colors.backdrop,
  },
  spacing,
  borderRadius,
  shadows,
  typography,
};

export type AppTheme = typeof theme;
