import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '@/types/navigation';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '@/theme/colors';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tab.Screen
        name="Map"
        component={() => null}
        options={{
          tabBarIcon: ({ color, size }) => <Icon name="map" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Emergency"
        component={() => null}
        options={{
          tabBarIcon: ({ color, size }) => <Icon name="warning" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={() => null}
        options={{
          tabBarIcon: ({ color, size }) => <Icon name="person" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};
