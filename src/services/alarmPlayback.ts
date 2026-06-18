import { Audio, AVPlaybackSource } from 'expo-av';
import { AlarmToneId, getAlarmTone } from '../constants/alarmTones';
import { getAlarmToneId, getCustomAlarmTone } from '../storage/reminderSettings';

let activeSound: Audio.Sound | null = null;

async function resolvePlaybackSource(toneId: AlarmToneId): Promise<AVPlaybackSource | null> {
  if (toneId === 'custom') {
    const custom = await getCustomAlarmTone();
    return custom?.uri ? { uri: custom.uri } : null;
  }

  const tone = getAlarmTone(toneId);
  if (tone.preview) return tone.preview;
  return null;
}

export async function stopAlarmRingtone(): Promise<void> {
  if (!activeSound) return;
  try {
    await activeSound.stopAsync();
    await activeSound.unloadAsync();
  } catch {
    // ignore
  }
  activeSound = null;
}

/** Play the selected alarm tone in full (loops for custom tone until stopped). */
export async function playAlarmRingtone(toneId?: AlarmToneId): Promise<void> {
  const id = toneId ?? (await getAlarmToneId());
  const source = await resolvePlaybackSource(id);
  if (!source) return;

  await stopAlarmRingtone();

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
    shouldDuckAndroid: false,
    playThroughEarpieceAndroid: false,
  });

  const { sound } = await Audio.Sound.createAsync(
    source,
    {
      shouldPlay: true,
      isLooping: id === 'custom',
      volume: 1,
    },
    status => {
      if (status.isLoaded && status.didJustFinish && id !== 'custom') {
        stopAlarmRingtone();
      }
    }
  );

  activeSound = sound;
}

export async function previewAlarmRingtone(toneId: AlarmToneId): Promise<Audio.Sound | null> {
  await stopAlarmRingtone();

  const source = await resolvePlaybackSource(toneId);
  if (!source) return null;

  await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

  const { sound } = await Audio.Sound.createAsync(source, {
    shouldPlay: true,
    isLooping: false,
    volume: 1,
  });

  activeSound = sound;
  return sound;
}

export function getActiveAlarmSound(): Audio.Sound | null {
  return activeSound;
}
