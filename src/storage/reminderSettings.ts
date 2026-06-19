import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { AlarmToneId, DEFAULT_ALARM_TONE_ID } from '../constants/alarmTones';

const ALARM_TONE_KEY = '@alkitab/alarm-tone';
const CUSTOM_ALARM_KEY = '@alkitab/custom-alarm-tone';
const SNOOZE_ENABLED_KEY = '@alkitab/snooze-enabled';
const SNOOZE_MINUTES_KEY = '@alkitab/snooze-minutes';
const ADVANCE_REMINDER_KEY = '@alkitab/advance-reminder-enabled';

export const UPCOMING_REMINDER_MINUTES = 30;

export const DEFAULT_SNOOZE_MINUTES = 10;
export const SNOOZE_MINUTE_OPTIONS = [5, 10, 15, 20, 30] as const;

export type CustomAlarmTone = {
  uri: string;
  name: string;
};

const CUSTOM_ALARM_DIR = `${FileSystem.documentDirectory}alarm-tones/`;

export async function getAlarmToneId(): Promise<AlarmToneId> {
  try {
    const raw = await AsyncStorage.getItem(ALARM_TONE_KEY);
    if (
      raw === 'default' ||
      raw === 'classic_alarm' ||
      raw === 'soft_chime' ||
      raw === 'digital_beep' ||
      raw === 'gentle_bell' ||
      raw === 'custom'
    ) {
      return raw;
    }
  } catch {
    // ignore
  }
  return DEFAULT_ALARM_TONE_ID;
}

export async function setAlarmToneId(id: AlarmToneId): Promise<void> {
  await AsyncStorage.setItem(ALARM_TONE_KEY, id);
}

export async function getCustomAlarmTone(): Promise<CustomAlarmTone | null> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_ALARM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CustomAlarmTone;
    if (!parsed?.uri) return null;
    const info = await FileSystem.getInfoAsync(parsed.uri);
    if (!info.exists) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function pickAndSaveCustomAlarmTone(): Promise<CustomAlarmTone | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['audio/*'],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const extMatch = asset.name.match(/(\.[a-z0-9]+)$/i);
  const ext = extMatch ? extMatch[1].toLowerCase() : '.mp3';

  await FileSystem.makeDirectoryAsync(CUSTOM_ALARM_DIR, { intermediates: true });

  const dirEntries = await FileSystem.readDirectoryAsync(CUSTOM_ALARM_DIR).catch(() => []);
  for (const file of dirEntries) {
    await FileSystem.deleteAsync(`${CUSTOM_ALARM_DIR}${file}`, { idempotent: true });
  }

  const dest = `${CUSTOM_ALARM_DIR}user_alarm${ext}`;
  await FileSystem.copyAsync({ from: asset.uri, to: dest });

  const custom: CustomAlarmTone = { uri: dest, name: asset.name };
  await AsyncStorage.setItem(CUSTOM_ALARM_KEY, JSON.stringify(custom));
  await setAlarmToneId('custom');
  return custom;
}

export async function clearCustomAlarmTone(): Promise<void> {
  await AsyncStorage.removeItem(CUSTOM_ALARM_KEY);
  const dirEntries = await FileSystem.readDirectoryAsync(CUSTOM_ALARM_DIR).catch(() => []);
  for (const file of dirEntries) {
    await FileSystem.deleteAsync(`${CUSTOM_ALARM_DIR}${file}`, { idempotent: true });
  }
}

export async function getSnoozeEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(SNOOZE_ENABLED_KEY);
    if (raw === 'false') return false;
  } catch {
    // ignore
  }
  return true;
}

export async function setSnoozeEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(SNOOZE_ENABLED_KEY, enabled ? 'true' : 'false');
}

export async function getSnoozeMinutes(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(SNOOZE_MINUTES_KEY);
    const n = raw ? parseInt(raw, 10) : DEFAULT_SNOOZE_MINUTES;
    if (SNOOZE_MINUTE_OPTIONS.includes(n as (typeof SNOOZE_MINUTE_OPTIONS)[number])) return n;
  } catch {
    // ignore
  }
  return DEFAULT_SNOOZE_MINUTES;
}

export async function setSnoozeMinutes(minutes: number): Promise<void> {
  await AsyncStorage.setItem(SNOOZE_MINUTES_KEY, String(minutes));
}

export async function getAdvanceReminderEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(ADVANCE_REMINDER_KEY);
    if (raw === 'false') return false;
  } catch {
    // ignore
  }
  return true;
}

export async function setAdvanceReminderEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(ADVANCE_REMINDER_KEY, enabled ? 'true' : 'false');
}
