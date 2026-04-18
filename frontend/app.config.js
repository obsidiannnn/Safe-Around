const resolveOptionalEnv = (...values) => {
  const resolved = values.find((value) => typeof value === 'string' && value.trim() !== '');
  if (!resolved) {
    return undefined;
  }

  return /^your[-_]/i.test(resolved) ? undefined : resolved;
};

const googleMapsApiKey = resolveOptionalEnv(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY);
const easProjectId = resolveOptionalEnv(process.env.EXPO_PUBLIC_EAS_PROJECT_ID, process.env.EAS_PROJECT_ID);

module.exports = () => ({
  expo: {
    name: 'SafeAround',
    slug: 'safearound-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/native-splash.png',
      resizeMode: 'contain',
      backgroundColor: '#F2F6FF',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.safearound.app',
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'SafeAround needs your location to show nearby safe zones and alert your emergency contacts.',
        NSLocationAlwaysAndWhenInUseUsageDescription:
          'SafeAround needs background location access to provide continuous safety monitoring.',
        NSLocationAlwaysUsageDescription:
          'SafeAround needs background location access to provide continuous safety monitoring and geofencing alerts.',
        NSMotionUsageDescription:
          'SafeAround uses motion detection for shake-to-alert emergency feature.',
        NSCameraUsageDescription:
          'SafeAround needs camera access to capture emergency photos.',
        NSMicrophoneUsageDescription:
          'SafeAround needs microphone access to record emergency audio.',
        UIBackgroundModes: ['location', 'fetch'],
      },
      minimumOsVersion: '13.0',
      config: googleMapsApiKey ? { googleMapsApiKey } : undefined,
    },
    android: {
      package: 'com.safearound.app',
      adaptiveIcon: {
        backgroundColor: '#D32F2F',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      permissions: [
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'ACCESS_BACKGROUND_LOCATION',
        'FOREGROUND_SERVICE',
        'FOREGROUND_SERVICE_LOCATION',
        'ACTIVITY_RECOGNITION',
        'CAMERA',
        'RECORD_AUDIO',
        'VIBRATE',
        'POST_NOTIFICATIONS',
      ],
      minSdkVersion: 24,
      config: googleMapsApiKey ? { googleMaps: { apiKey: googleMapsApiKey } } : undefined,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-location',
      'expo-notifications',
      'expo-camera',
      'expo-av',
    ],
    extra: {
      eas: easProjectId ? { projectId: easProjectId } : undefined,
    },
  },
});
