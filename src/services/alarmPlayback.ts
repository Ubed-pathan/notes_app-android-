import { Audio, AVPlaybackSource } from 'expo-av';
import { getCustomAlarmTone } from '../storage/reminderSettings';

let activeSound: Audio.Sound | null = null;
let alarmMaxTimer: ReturnType<typeof setTimeout> | null = null;
let alarmReplayStop = false;

/** Custom tone replays for up to 3 minutes unless Stop/Snooze is tapped. */
const CUSTOM_ALARM_MAX_MS = 180_000;

function clearAlarmMaxTimer(): void {
  if (alarmMaxTimer) {
    clearTimeout(alarmMaxTimer);
    alarmMaxTimer = null;
  }
}

async function resolvePlaybackSource(): Promise<AVPlaybackSource | null> {
  const custom = await getCustomAlarmTone();
  if (!custom?.uri) return null;
  const uri = custom.uri.startsWith('file://') ? custom.uri : `file://${custom.uri}`;
  return { uri };
}

export async function stopAlarmRingtone(): Promise<void> {
  alarmReplayStop = true;
  clearAlarmMaxTimer();
  if (!activeSound) return;
  try {
    await activeSound.stopAsync();
    await activeSound.unloadAsync();
  } catch {
    // ignore
  }
  activeSound = null;
}

async function playCustomAlarmOnce(): Promise<void> {
  if (alarmReplayStop) return;

  const source = await resolvePlaybackSource();
  if (!source) return;

  if (activeSound) {
    try {
      await activeSound.unloadAsync();
    } catch {
      // ignore
    }
    activeSound = null;
  }

  const { sound } = await Audio.Sound.createAsync(source, {
    shouldPlay: true,
    isLooping: false,
    volume: 1,
  });

  activeSound = sound;
  sound.setOnPlaybackStatusUpdate(status => {
    if (status.isLoaded && status.didJustFinish && !alarmReplayStop) {
      void playCustomAlarmOnce();
    }
  });
}

/** Play custom alarm — loops until Stop/Snooze or max duration. */
export async function playAlarmRingtone(): Promise<void> {
  const source = await resolvePlaybackSource();
  if (!source) return;

  await stopAlarmRingtone();
  alarmReplayStop = false;

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
    shouldDuckAndroid: false,
    playThroughEarpieceAndroid: false,
  });

  clearAlarmMaxTimer();
  alarmMaxTimer = setTimeout(() => {
    void stopAlarmRingtone();
  }, CUSTOM_ALARM_MAX_MS);

  await playCustomAlarmOnce();
}

export async function previewCustomAlarmTone(): Promise<Audio.Sound | null> {
  const custom = await getCustomAlarmTone();
  if (!custom?.uri) return null;

  await stopAlarmRingtone();

  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: false,
    playThroughEarpieceAndroid: false,
  });

  const uri = custom.uri.startsWith('file://') ? custom.uri : `file://${custom.uri}`;
  const { sound } = await Audio.Sound.createAsync(
    { uri },
    { shouldPlay: true, isLooping: true, volume: 1 }
  );

  activeSound = sound;
  return sound;
}

export function getActiveAlarmSound(): Audio.Sound | null {
  return activeSound;
}
