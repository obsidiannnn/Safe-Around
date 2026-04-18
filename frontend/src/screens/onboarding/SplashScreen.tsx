import React from 'react';
import { LoadingOverlay } from '@/components/common/LoadingOverlay';

/**
 * Lightweight branded loading screen while auth/session state is restoring.
 * Navigation is handled by AppNavigator once auth loading completes.
 */
export const SplashScreen = () => {
  return (
    <LoadingOverlay
      visible={true}
      message="Restoring your secure session"
    />
  );
};
