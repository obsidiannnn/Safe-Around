import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

export const ActivityTab = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Activity History</Text>
      <Text style={styles.subText}>No recent activity found.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  subText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
});