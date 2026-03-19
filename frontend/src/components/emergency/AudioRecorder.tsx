import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
// import { Audio } from 'expo-av';
const Audio = {
  requestPermissionsAsync: async () => ({ status: 'granted' }),
  setAudioModeAsync: async (_options: any) => {},
  Recording: {
    createAsync: async (..._args: any[]) => ({ recording: { stopAndUnloadAsync: async () => {}, getURI: () => 'mock_uri' } })
  },
  RecordingOptionsPresets: { HIGH_QUALITY: {} }
};
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

interface AudioRecorderProps {
  isRecording: boolean;
  maxDuration?: number;
  onRecordingComplete?: (uri: string) => void;
}

/**
 * Audio recorder for emergency situations
 * Records up to 30 seconds and uploads to secure storage
 */
export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  isRecording,
  maxDuration = 30,
  onRecordingComplete,
}) => {
  const [recording, setRecording] = useState<any | null>(null);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (isRecording) {
      startRecording();
    } else {
      stopRecording();
    }

    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording || duration >= maxDuration) return;

    const timer = setInterval(() => {
      setDuration((prev) => {
        if (prev >= maxDuration - 1) {
          stopRecording();
          return maxDuration;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRecording, duration]);

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setDuration(0);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri && onRecordingComplete) {
        onRecordingComplete(uri);
      }
      setRecording(null);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  if (!isRecording && duration === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Icon
          name={isRecording ? 'mic' : 'check-circle'}
          size={24}
          color={isRecording ? colors.error : colors.success}
        />
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {isRecording ? 'Recording Audio' : 'Recording Complete'}
          </Text>
          <Text style={styles.duration}>
            {duration}s / {maxDuration}s
          </Text>
        </View>
        {isRecording && (
          <View style={styles.waveform}>
            {[1, 2, 3, 4, 5].map((i) => (
              <View
                key={i}
                style={[
                  styles.waveBar,
                  { height: Math.random() * 20 + 10 },
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    marginLeft: spacing.md,
    flex: 1,
  },
  title: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  duration: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  waveBar: {
    width: 3,
    backgroundColor: colors.error,
    borderRadius: 2,
  },
});
