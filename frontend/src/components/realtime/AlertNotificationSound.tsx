import { useEffect } from 'react';
// import { Audio } from 'expo-av';
const Audio = {
  Sound: {
    createAsync: async () => ({ sound: { playAsync: async () => {}, unloadAsync: async () => {} } })
  }
};
import * as Haptics from 'expo-haptics';

type SoundType = 'incoming_alert' | 'responder_accepted' | 'alert_resolved';

interface AlertNotificationSoundProps {
  type: SoundType;
  play: boolean;
}

export const AlertNotificationSound: React.FC<AlertNotificationSoundProps> = ({ type, play }) => {
  useEffect(() => {
    if (!play) return;

    const playSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync();
        await sound.playAsync();
        
        // Vibration patterns
        switch (type) {
          case 'incoming_alert':
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            break;
          case 'responder_accepted':
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            break;
          case 'alert_resolved':
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            break;
        }
      } catch (error) {
        console.error('Error playing sound:', error);
      }
    };

    playSound();
  }, [play, type]);

  return null;
};
