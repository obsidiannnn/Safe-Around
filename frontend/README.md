# SafeAround Mobile App

A personal safety network platform built with React Native and Expo.

## Tech Stack

- **Framework**: React Native 0.73+ with TypeScript
- **Build Tool**: Expo (managed workflow)
- **Navigation**: React Navigation 6.x
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Maps**: React Native Maps
- **Real-time**: Socket.IO Client
- **Storage**: AsyncStorage + MMKV
- **Forms**: React Hook Form + Zod
- **UI**: React Native Paper (Material Design 3)
- **Animations**: React Native Reanimated 3

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- iOS Simulator (Mac only) or Android Studio

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   - Copy `.env.development` and update with your API endpoints
   - Add your Google Maps API key

3. Start the development server:
```bash
npm start
```

## Running the App

### iOS
```bash
npm run ios
```

### Android
```bash
npm run android
```

### Web (for testing)
```bash
npm run web
```

## Environment Variables

- `API_URL`: Backend API endpoint
- `WS_URL`: WebSocket server endpoint
- `GOOGLE_MAPS_API_KEY`: Google Maps API key

## Project Structure

```
src/
├── navigation/      # Navigation configuration
├── screens/         # Screen components
├── components/      # Reusable components
├── store/          # Zustand state stores
├── services/       # API, WebSocket, Location services
├── hooks/          # Custom React hooks
├── utils/          # Utility functions
├── theme/          # Theme configuration
└── types/          # TypeScript type definitions
```

## Features

- Real-time location tracking
- Emergency alert system
- Push notifications
- Offline support
- Background location updates
- Emergency contact management

## Minimum Requirements

- iOS 13.0+
- Android 7.0+ (API 24)
