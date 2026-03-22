import * as Speech from 'expo-speech';

// Safe wrapper for Audio to prevent native module crashes
let Audio: any = null;
try {
  const AudioModule = require('expo-av').Audio;
  if (AudioModule) {
    Audio = AudioModule;
  }
} catch (e) {
  console.warn('Native Audio module (expo-av) could not be loaded. Pings will be disabled.');
}

// Premium high-trust sound effects (Public CDN placeholders)
const SOUNDS = {
  PING: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3', 
  SUCCESS: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  ALERT: 'https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3',
};

class AudioService {
  private isMuted: boolean = false;

  async playSound(type: keyof typeof SOUNDS) {
    if (this.isMuted || !Audio) return;
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: SOUNDS[type] },
        { shouldPlay: true }
      );
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
        }
      });
    } catch (error) {
      console.warn('Audio playback failed (Native module likely missing):', error);
    }
  }

  async speak(text: string) {
    if (this.isMuted) return;
    try {
      await Speech.stop();
      await Speech.speak(text, {
        rate: 1.0,
        pitch: 1.0,
        language: 'en',
      });
    } catch (error) {
       console.warn('Speech guidance failed:', error);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      Speech.stop().catch(() => {});
    }
    return this.isMuted;
  }

  stopAll() {
    Speech.stop().catch(() => {});
  }
}

export const audioService = new AudioService();
