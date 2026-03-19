import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type AvatarSize = 'small' | 'medium' | 'large';

interface AvatarProps {
  imageUri?: string;
  name?: string;
  size?: AvatarSize;
  showStatus?: boolean;
  isOnline?: boolean;
}

/**
 * Avatar component with image or initials fallback
 * Supports status indicator and multiple sizes
 */
export const Avatar: React.FC<AvatarProps> = ({
  imageUri,
  name,
  size = 'medium',
  showStatus = false,
  isOnline = false,
}) => {
  const getInitials = (fullName?: string): string => {
    if (!fullName) return '?';
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  const sizeStyle = styles[size];
  const fontSize = size === 'small' ? 14 : size === 'medium' ? 18 : 24;

  return (
    <View style={[styles.container, sizeStyle]}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={[styles.image, sizeStyle]} />
      ) : (
        <View style={[styles.placeholder, sizeStyle]}>
          <Text style={[styles.initials, { fontSize }]}>{getInitials(name)}</Text>
        </View>
      )}
      
      {showStatus && (
        <View style={[styles.statusIndicator, isOnline ? styles.online : styles.offline]} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    borderRadius: 9999,
  },
  placeholder: {
    backgroundColor: colors.secondary,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: colors.surface,
    fontWeight: '600',
  },
  small: {
    width: 32,
    height: 32,
  },
  medium: {
    width: 48,
    height: 48,
  },
  large: {
    width: 72,
    height: 72,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  online: {
    backgroundColor: colors.success,
  },
  offline: {
    backgroundColor: colors.textSecondary,
  },
});
