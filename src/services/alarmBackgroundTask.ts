import * as TaskManager from 'expo-task-manager';
import { playAlarmRingtone } from './alarmPlayback';
import { isExpoGo } from '../utils/isExpoGo';

export const ALARM_BACKGROUND_TASK = 'alkitab-alarm-background';

TaskManager.defineTask(ALARM_BACKGROUND_TASK, async ({ data }: { data?: unknown }) => {
  if (!data || typeof data !== 'object' || 'actionIdentifier' in data) return;

  const payload = (data as { data?: Record<string, unknown> }).data;
  if (payload?.isAlarm !== true) return;

  await playAlarmRingtone();
});

let registered = false;

/** Registers a headless task so custom tone can play when a notification wakes the app. */
export async function registerAlarmBackgroundTask(): Promise<void> {
  if (registered || isExpoGo()) return;

  try {
    const Notifications = await import('expo-notifications');
    try {
      await Notifications.setAutoServerRegistrationEnabledAsync(false);
    } catch {
      // ignore
    }

    const already = await TaskManager.isTaskRegisteredAsync(ALARM_BACKGROUND_TASK);
    if (!already) {
      await Notifications.registerTaskAsync(ALARM_BACKGROUND_TASK);
    }
    registered = true;
  } catch {
    // Unavailable in Expo Go or dev client not built yet
  }
}
