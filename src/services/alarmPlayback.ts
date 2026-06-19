import { Audio, AVPlaybackSource } from 'expo-av';
import { AlarmToneId, getAlarmTone } from '../constants/alarmTones';
import { getAlarmToneId, getCustomAlarmTone } from '../storage/reminderSettings';

let activeSound: Audio.Sound | null = null;
let alarmMaxTimer: ReturnType<typeof setTimeout> | null = null;
let alarmReplayStop = false;

/** Built-in tones replay for up to 60s unless Stop/Snooze is tapped. */
const BUILTIN_ALARM_MAX_MS = 60_000;

function clearAlarmMaxTimer(): void {
  if (alarmMaxTimer) {
    clearTimeout(alarmMaxTimer);
    alarmMaxTimer = null;
  }
}

async function resolvePlaybackSource(toneId: AlarmToneId): Promise<AVPlaybackSource | null> {
  if (toneId === 'custom') {
    const custom = await getCustomAlarmTone();
    if (!custom?.uri) return null;
    const uri = custom.uri.startsWith('file://') ? custom.uri : `file://${custom.uri}`;
    return { uri };
  }

  const tone = getAlarmTone(toneId);
  if (tone.preview) return tone.preview;
  return null;
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

async function playBuiltinAlarmOnce(id: AlarmToneId): Promise<void> {
  if (alarmReplayStop) return;

  const source = await resolvePlaybackSource(id);
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
      void playBuiltinAlarmOnce(id);
    }
  });
}

/**
 * Play alarm when a reminder fires.
 * - Custom tone: loops until Stop or Snooze.
 * - Built-in tones: replay for up to 60 seconds, then auto-stop.
 */
export async function playAlarmRingtone(toneId?: AlarmToneId): Promise<void> {
  const id = toneId ?? (await getAlarmToneId());
  const source = await resolvePlaybackSource(id);
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

  if (id === 'custom') {
    const { sound } = await Audio.Sound.createAsync(
      source,
      { shouldPlay: true, isLooping: true, volume: 1 }
    );
    activeSound = sound;
    return;
  }

  clearAlarmMaxTimer();
  alarmMaxTimer = setTimeout(() => {
    void stopAlarmRingtone();
  }, BUILTIN_ALARM_MAX_MS);

  await playBuiltinAlarmOnce(id);
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

export async function previewAlarmRingtone(toneId: AlarmToneId): Promise<Audio.Sound | null> {
  if (toneId === 'custom') return previewCustomAlarmTone();

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
