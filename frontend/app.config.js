const mapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

module.exports = () => ({
  expo: {
    name: 'SafeAround',
    slug: 'safearound',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: false,
    jsEngine: 'jsc',
    splash: {
      image: './assets/icon.png',
      resizeMode: 'contain',
      backgroundColor: '#F2F6FF',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.safearound.app',
      config: mapsApiKey
        ? {
            googleMapsApiKey: mapsApiKey,
          }
        : undefined,
    },
    android: {
      package: 'com.safearound.app',
      googleServicesFile: './google-services.json',
      config: mapsApiKey
        ? {
            googleMaps: {
              apiKey: mapsApiKey,
            },
          }
        : undefined,
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
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-location',
      'expo-notifications',
      'expo-camera',
      'expo-font',
    ],
    extra: {
      eas: {
        projectId: '7ce2c65d-8aab-4188-8404-183e8c7f2317',
      },
    },
  },
});
