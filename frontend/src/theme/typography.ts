export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
};

export const fontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  bold: '700' as const,
};

export const typography = {
  h1: {
    fontSize: fontSizes['4xl'],
    fontWeight: fontWeights.bold,
    lineHeight: 40,
  },
  h2: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    lineHeight: 32,
  },
  h3: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.medium,
    lineHeight: 28,
  },
  body1: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.regular,
    lineHeight: 24,
  },
  body2: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    lineHeight: 20,
  },
  caption: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.regular,
    lineHeight: 16,
  },
  button: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.medium,
    lineHeight: 24,
  },
};
