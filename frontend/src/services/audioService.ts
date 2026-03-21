import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

// Premium high-trust sound effects (Public CDN placeholders)
const SOUNDS = {
  PING: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3', // Soft UI chime
  SUCCESS: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', // Goal reached
  ALERT: 'https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3', // Transition sound
};

class AudioService {
  private isMuted: boolean = false;
  private currentSpeech: string | null = null;

  async playSound(type: keyof typeof SOUNDS) {
    if (this.isMuted) return;
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: SOUNDS[type] },
        { shouldPlay: true }
      );
      // Automatically unload sound from memory when done
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.warn('Audio play failed:', error);
    }
  }

  async speak(text: string) {
    if (this.isMuted) return;
    Speech.stop();
    Speech.speak(text, {
      rate: 1.0,
      pitch: 1.0,
      language: 'en',
    });
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      Speech.stop();
    }
    return this.isMuted;
  }

  stopAll() {
    Speech.stop();
  }
}

export const audioService = new AudioService();
