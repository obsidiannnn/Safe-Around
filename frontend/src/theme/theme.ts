import { MD3LightTheme as DefaultTheme } from 'react-native-paper';
import { colors } from './colors';
import { spacing, borderRadius, shadows } from './spacing';
import { typography, fontSizes, fontWeights } from './typography';

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
    warning: colors.warning,
    success: colors.success,
    info: colors.info,
  },
  spacing,
  borderRadius,
  shadows,
  typography: {
    ...typography,
    sizes: fontSizes,
    weights: fontWeights,
  },
};

export type AppTheme = typeof theme;
