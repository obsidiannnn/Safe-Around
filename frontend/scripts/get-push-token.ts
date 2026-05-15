/**
 * Script to get your device's Expo Push Token
 * 
 * Usage:
 * 1. Open your SafeAround app on a physical device
 * 2. Go to Profile or Settings screen
 * 3. Look for "Push Token" or add this code temporarily to any screen:
 * 
 * import { notificationService } from '@/services/notifications/notificationService';
 * 
 * useEffect(() => {
 *   (async () => {
 *     const hasPermission = await notificationService.requestPermission();
 *     if (hasPermission) {
 *       const token = await notificationService.getToken();
 *       console.log('📱 Your Expo Push Token:', token);
 *       Alert.alert('Push Token', token || 'No token');
 *     }
 *   })();
 * }, []);
 * 
 * 4. Copy the token that appears in console or alert
 * 5. Use it to test notifications with the backend script
 */

export {};
