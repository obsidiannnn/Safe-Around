import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/theme';

export const OfflineBar: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  const handleRetry = async () => {
    const state = await NetInfo.fetch();
    setIsOffline(!state.isConnected);
  };

  if (!isOffline) return null;

  return (
    <View style={styles.container}>
      <Ionicons name="cloud-offline" size={20} color="#fff" />
      <Text style={styles.text}>No internet connection</Text>
      <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.error,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  text: {
    flex: 1,
    fontSize: theme.typography.sizes.sm,
    color: '#fff',
    fontWeight: theme.typography.weights.medium,
  },
  retryButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: theme.borderRadius.sm,
  },
  retryText: {
    fontSize: theme.typography.sizes.sm,
    color: '#fff',
    fontWeight: theme.typography.weights.bold,
  },
});
