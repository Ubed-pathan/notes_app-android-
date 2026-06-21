import { Platform } from 'react-native';
import { getCustomAlarmTone } from '../storage/reminderSettings';

export const CUSTOM_ALARM_CHANNEL_ID = 'alkitab-my-tone-v3';

/** Notification sound — custom file URI on Android (needs prebuild plugin), default on iOS. */
export async function resolveAlarmNotificationSound(): Promise<string | boolean | undefined> {
  const custom = await getCustomAlarmTone();
  if (!custom?.uri) return undefined;

  if (Platform.OS === 'android') {
    const path = custom.uri.replace(/^file:\/\//, '');
    return `file://${path}`;
  }

  return true;
}
