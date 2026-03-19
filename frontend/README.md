# SafeAround Mobile App

A community-driven safety app that helps users stay safe by providing real-time crime heatmaps, emergency alerts, and location-based safety features.

## Features

- **Real-time Crime Heatmap**: View crime data overlaid on an interactive map
- **Emergency SOS**: Quick emergency alert system with location sharing
- **Geofencing**: Automatic alerts when entering high-risk areas
- **Safe Routes**: Plan routes that avoid dangerous areas
- **Community Alerts**: Send and respond to emergency alerts from nearby users
- **Real-time Chat**: Communicate with responders during emergencies
- **Location Tracking**: Background location tracking for safety
- **Push Notifications**: Receive alerts about nearby incidents

## Prerequisites

- Node.js 16+ and npm
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac only) or Android Emulator
- Physical device for testing location features

## Installation

1. Clone the repository:
```bash
git clone https://github.com/obsidiannnn/Safe-Around.git
cd Safe-Around/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment files:
```bash
cp .env.development.example .env.development
cp .env.production.example .env.production
```

4. Update environment variables with your API endpoints

## Running the App

### Development

Start the Expo development server:
```bash
npm start
```

### iOS Simulator (Mac only)
```bash
npm run ios
```

### Android Emulator
```bash
npm run android
```

### Web Browser
```bash
npm run web
```

## Project Structure

```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── screens/        # Screen components
│   ├── navigation/     # Navigation configuration
│   ├── services/       # API and service layer
│   ├── store/          # Zustand state management
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utility functions
│   ├── theme/          # Theme configuration
│   └── types/          # TypeScript type definitions
├── assets/             # Images, fonts, icons
├── App.tsx            # Root component
└── app.json           # Expo configuration
```

## Tech Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript
- **State Management**: Zustand
- **Navigation**: React Navigation
- **Maps**: React Native Maps
- **Real-time**: Socket.IO
- **HTTP Client**: Axios
- **Notifications**: Expo Notifications
- **Storage**: MMKV
- **Forms**: React Hook Form + Zod
- **Animations**: Reanimated 3

## Building for Production

### iOS
```bash
expo build:ios
```

### Android
```bash
expo build:android
```

## Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm test -- --watch
```

## Code Quality

Lint code:
```bash
npm run lint
```

Format code:
```bash
npm run format
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@safearound.com or open an issue on GitHub.
