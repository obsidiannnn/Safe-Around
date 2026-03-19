import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  loading?: boolean;
  debounceMs?: number;
  autoFocus?: boolean;
}

/**
 * Search bar component with debounced input and loading state
 * Includes clear button and search icon
 */
export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search...',
  loading = false,
  debounceMs = 300,
  autoFocus = false,
}) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      onChangeText(localValue);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, debounceMs]);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleClear = () => {
    setLocalValue('');
    onChangeText('');
  };

  return (
    <View style={styles.container}>
      <Icon name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
      
      <TextInput
        style={styles.input}
        value={localValue}
        onChangeText={setLocalValue}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel="Search input"
      />
      
      {loading && <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />}
      
      {!loading && localValue.length > 0 && (
        <Pressable onPress={handleClear} style={styles.clearButton}>
          <Icon name="close" size={20} color={colors.textSecondary} />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  loader: {
    marginLeft: spacing.sm,
  },
  clearButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
});
