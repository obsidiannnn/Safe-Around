import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthStackParamList } from '@/types/navigation';

const Stack = createStackNavigator<AuthStackParamList>();

export const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={() => null} />
      <Stack.Screen name="Register" component={() => null} />
      <Stack.Screen name="ForgotPassword" component={() => null} />
    </Stack.Navigator>
  );
};
