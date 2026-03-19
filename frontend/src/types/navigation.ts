import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  Permissions: undefined;
  EmergencyContacts: undefined;
  OnboardingTutorial: undefined;
  EmergencyActive: undefined;
  EmergencyResolution: undefined;
  ResponderNavigation: { alertId: string };
  AlertHistory: undefined;
  AlertDetail: { alertId: string };
  ResponderList: undefined;
  SafeRoute: undefined;
  Navigation: { route: any };
  LocationHistory: undefined;
  CrimeDetails: { zoneId: string };
  Chat: { alertId: string; roomId: string };
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
