import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ConnectionStatus } from '@/services/websocket/WebSocketService';
import { theme } from '@/theme';

interface ConnectionStatusBarProps {
  status: ConnectionStatus;
}

export const ConnectionStatusBar: React.FC<ConnectionStatusBarProps> = ({ status }) => {
  const [visible, setVisible] = useState(true);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (status === ConnectionStatus.CONNECTED) {
      const timer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 300 });
        setTimeout(() => setVisible(false), 300);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setVisible(true);
      opacity.value = withTiming(1, { duration: 300 });
    }
  }, [status]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const getStatusConfig = () => {
    switch (status) {
      case ConnectionStatus.CONNECTED:
        return { color: theme.colors.success, text: 'Live', icon: '●' };
      case ConnectionStatus.CONNECTING:
        return { color: theme.colors.warning, text: 'Connecting...', icon: '○' };
      case ConnectionStatus.RECONNECTING:
        return { color: theme.colors.warning, text: 'Reconnecting...', icon: '◐' };
      case ConnectionStatus.DISCONNECTED:
        return { color: theme.colors.error, text: 'No connection', icon: '○' };
    }
  };

  if (!visible && status === ConnectionStatus.CONNECTED) return null;

  const config = getStatusConfig();

  return (
    <Animated.View style={[styles.container, { backgroundColor: config.color }, animatedStyle]}>
      <Text style={styles.icon}>{config.icon}</Text>
      <Text style={styles.text}>{config.text}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  icon: {
    fontSize: theme.typography.sizes.md,
    color: '#fff',
  },
  text: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: '#fff',
  },
});
