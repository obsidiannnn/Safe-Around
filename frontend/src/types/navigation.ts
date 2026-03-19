import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  Permissions: undefined;
  EmergencyContacts: undefined;
  OnboardingTutorial: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  Register: undefined;
  PasswordReset: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Map: undefined;
  Emergency: undefined;
  Profile: undefined;
};
