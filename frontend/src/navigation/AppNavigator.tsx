import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from '@/types/navigation';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { SplashScreen } from '@/screens/onboarding/SplashScreen';
import { WelcomeScreen } from '@/screens/onboarding/WelcomeScreen';
import { PermissionsScreen } from '@/screens/onboarding/PermissionsScreen';
import { EmergencyContactsScreen } from '@/screens/onboarding/EmergencyContactsScreen';
import { OnboardingTutorialScreen } from '@/screens/onboarding/OnboardingTutorialScreen';
import { useAuthStore } from '@/store/authStore';

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuthStore();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoading ? (
          <Stack.Screen name="Splash" component={SplashScreen} />
        ) : !isAuthenticated ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Auth" component={AuthNavigator} />
            <Stack.Screen name="Permissions" component={PermissionsScreen} />
            <Stack.Screen name="EmergencyContacts" component={EmergencyContactsScreen} />
            <Stack.Screen name="OnboardingTutorial" component={OnboardingTutorialScreen} />
          </>
        ) : (
          <Stack.Screen name="Main" component={MainNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
