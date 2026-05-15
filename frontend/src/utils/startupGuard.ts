import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  pendingStartupAt: 'app:pendingStartupAt',
  lastStableStartupAt: 'app:lastStableStartupAt',
};

const CRASH_LOOP_WINDOW_MS = 10 * 60 * 1000;

const parseTimestamp = (value: string | null): number | null => {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const beginStartupAttempt = async (): Promise<boolean> => {
  const now = Date.now();

  try {
    const pendingRaw = await AsyncStorage.getItem(KEYS.pendingStartupAt);
    const pendingAt = parseTimestamp(pendingRaw);
    const safeMode = pendingAt !== null && now - pendingAt < CRASH_LOOP_WINDOW_MS;

    await AsyncStorage.setItem(KEYS.pendingStartupAt, String(now));
    return safeMode;
  } catch (error) {
    console.warn('Unable to evaluate startup guard state:', error);
    return false;
  }
};

export const markStartupStable = async (): Promise<void> => {
  const now = Date.now();

  try {
    await AsyncStorage.multiSet([
      [KEYS.lastStableStartupAt, String(now)],
      [KEYS.pendingStartupAt, ''],
    ]);
    await AsyncStorage.removeItem(KEYS.pendingStartupAt);
  } catch (error) {
    console.warn('Unable to mark startup as stable:', error);
  }
};
