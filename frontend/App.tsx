import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import { LoadingOverlay } from './src/components/common/LoadingOverlay';
import { OfflineBar } from './src/components/common/OfflineBar';
import { theme } from './src/theme/theme';
import { initializeApp } from './src/utils/initializeApp';

// Keep the native splash screen visible while the app bootstraps.
// This prevents a white/black flash before the JS bundle hydrates.
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);

  const onLayoutRootView = useCallback(async () => {
    if (!isInitializing) {
      await SplashScreen.hideAsync();
    }
  }, [isInitializing]);

  useEffect(() => {
    const init = async () => {
      await initializeApp();
      setIsInitializing(false);
    };
    init();
  }, []);

  if (isInitializing) {
    return <LoadingOverlay visible={true} message="Initializing SafeAround..." />;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <SafeAreaProvider>
          <PaperProvider theme={theme}>
            <StatusBar style="light" backgroundColor={theme.colors.primary} />
            <OfflineBar />
            <AppNavigator />
          </PaperProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

