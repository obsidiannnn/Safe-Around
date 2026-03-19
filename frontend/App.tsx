import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation/AppNavigator';
import { theme } from './src/theme/theme';
import { useAuthStore } from './src/store/authStore';
import { useWebSocketStore } from './src/store/websocketStore';
import { locationUploadService } from './src/services/location/LocationUploadService';

export default function App() {
  const { accessToken, isAuthenticated } = useAuthStore();
  const { connect, disconnect } = useWebSocketStore();

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      connect(accessToken);
      locationUploadService.startUploading();
    } else {
      disconnect();
      locationUploadService.stopUploading();
    }

    return () => {
      disconnect();
      locationUploadService.stopUploading();
    };
  }, [isAuthenticated, accessToken]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <StatusBar style="light" backgroundColor={theme.colors.primary} />
          <AppNavigator />
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

