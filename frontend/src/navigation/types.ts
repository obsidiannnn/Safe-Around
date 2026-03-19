import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, RouteProp } from '@react-navigation/native';
import { RootStackParamList, AuthStackParamList, MainTabParamList } from '@/types/navigation';

export type RootStackNavigationProp = StackNavigationProp<RootStackParamList>;

export type AuthStackNavigationProp = CompositeNavigationProp<
  StackNavigationProp<AuthStackParamList>,
  RootStackNavigationProp
>;

export type MainTabNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  RootStackNavigationProp
>;
