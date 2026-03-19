import { useEffect, useState } from 'react';
import { Accelerometer } from 'expo-sensors';

interface ShakeDetectionOptions {
  threshold?: number;
  timeout?: number;
  onShake: () => void;
  enabled?: boolean;
}

/**
 * Custom hook for detecting shake gestures
 * Triggers callback after 3 consecutive shakes
 */
export const useShakeDetection = ({
  threshold = 2.5,
  timeout = 500,
  onShake,
  enabled = true,
}: ShakeDetectionOptions) => {
  const [shakeCount, setShakeCount] = useState(0);
  const [lastShakeTime, setLastShakeTime] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    const subscription = Accelerometer.addListener((accelerometerData) => {
      const { x, y, z } = accelerometerData;
      const acceleration = Math.sqrt(x * x + y * y + z * z);

      if (acceleration > threshold) {
        const now = Date.now();

        if (now - lastShakeTime < timeout) {
          const newCount = shakeCount + 1;
          setShakeCount(newCount);

          if (newCount >= 3) {
            onShake();
            setShakeCount(0);
          }
        } else {
          setShakeCount(1);
        }

        setLastShakeTime(now);
      }
    });

    Accelerometer.setUpdateInterval(100);

    return () => subscription.remove();
  }, [enabled, shakeCount, lastShakeTime, threshold, timeout]);

  return { shakeCount };
};
