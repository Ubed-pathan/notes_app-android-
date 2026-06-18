import { Platform } from 'react-native';
import { upsertNote, getNote, listNotes } from '../storage/notes';
import { getAlarmToneId } from '../storage/reminderSettings';
import { getAlarmTone, getNotificationSound, getReminderChannelId, shouldPlayFullAlarmInApp } from '../constants/alarmTones';
import { playAlarmRingtone, stopAlarmRingtone } from './alarmPlayback';

type NotificationsModule = typeof import('expo-notifications');

let notificationsModule: NotificationsModule | null | undefined;
let handlerConfigured = false;
let initPromise: Promise<NotificationsModule | null> | null = null;

export type ScheduleResult =
  | { ok: true; id: string }
  | { ok: false; reason: string; message: string };

export function isExpoGo(): boolean {
  try {
    const Constants = require('expo-constants').default;
    const { ExecutionEnvironment } = require('expo-constants');
    return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  } catch {
    return false;
  }
}

async function getNotifications(): Promise<NotificationsModule | null> {
  // expo-notifications crashes in Expo Go on import (push token registration)
  if (isExpoGo()) return null;

  if (notificationsModule) return notificationsModule;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const Notifications = await import('expo-notifications');

      // Disable remote push auto-registration (breaks in Expo Go, not needed for local alarms)
      try {
        await Notifications.setAutoServerRegistrationEnabledAsync(false);
      } catch {
        // ignore — not available in all environments
      }

      if (!handlerConfigured) {
        Notifications.setNotificationHandler({
          handleNotification: async () => {
            const toneId = await getAlarmToneId();
            return {
              shouldShowAlert: true,
              shouldPlaySound: !shouldPlayFullAlarmInApp(toneId),
              shouldSetBadge: true,
              shouldShowBanner: true,
              shouldShowList: true,
              priority: Notifications.AndroidNotificationPriority.MAX,
            };
          },
        });
        handlerConfigured = true;
      }

      notificationsModule = Notifications;
      return Notifications;
    } catch {
      return null;
    }
  })();

  return initPromise;
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const Notifications = await getNotifications();
  if (!Notifications) return false;

  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.status === 'granted') return true;

  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  return requested.granted || requested.status === 'granted';
}

export async function setupAndroidChannel(toneId?: import('../constants/alarmTones').AlarmToneId): Promise<string> {
  const Notifications = await getNotifications();
  if (!Notifications || Platform.OS !== 'android') return 'reminders-default';

  const id = toneId ?? (await getAlarmToneId());
  const tone = getAlarmTone(id);
  const channelId = getReminderChannelId(id);
  const sound = getNotificationSound(tone);
  const channelLabel =
    id === 'custom' ? 'Alarms · My tone' : id === 'default' ? 'Reminders' : `Alarms · ${tone.label}`;

  await Notifications.setNotificationChannelAsync(channelId, {
    name: channelLabel,
    description: 'Note reminder alarms',
    importance: Notifications.AndroidImportance.MAX,
    sound: typeof sound === 'string' ? sound : 'default',
    vibrationPattern: [0, 600, 200, 600, 200, 600],
    enableVibrate: true,
    bypassDnd: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    audioAttributes: {
      usage: Notifications.AndroidAudioUsage.ALARM,
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
    },
  });

  return channelId;
}

export async function scheduleNoteReminder(
  noteId: string,
  title: string,
  reminderAt: number
): Promise<ScheduleResult> {
  if (reminderAt <= Date.now()) {
    return { ok: false, reason: 'past', message: 'Reminder time must be in the future.' };
  }

  const Notifications = await getNotifications();
  if (!Notifications) {
    return {
      ok: false,
      reason: 'unavailable',
      message: 'Notifications are not available. Run: npm run android',
    };
  }

  const granted = await requestNotificationPermissions();
  if (!granted) {
    return {
      ok: false,
      reason: 'permission',
      message: 'Notification permission is required for reminders. Enable it in Settings.',
    };
  }

  try {
    const note = await getNote(noteId);
    if (note?.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(note.notificationId);
    }

    const toneId = await getAlarmToneId();
    const tone = getAlarmTone(toneId);
    const channelId = await setupAndroidChannel(toneId);
    const sound = getNotificationSound(tone);

    const trigger: import('expo-notifications').DateTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(reminderAt),
      channelId,
    };

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Alarm',
        body: title?.trim() || 'You have a note reminder',
        sound,
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 600, 200, 600, 200, 600],
        data: { noteId },
        sticky: true,
        ...(Platform.OS === 'android'
          ? { categoryIdentifier: 'alarm' }
          : { interruptionLevel: 'timeSensitive' as const }),
      },
      trigger,
    });

    await upsertNote({ id: noteId, notificationId: id, reminderAt });
    return { ok: true, id };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to schedule reminder.';
    return { ok: false, reason: 'error', message };
  }
}

export async function cancelNoteReminder(noteId: string): Promise<void> {
  const Notifications = await getNotifications();
  const note = await getNote(noteId);
  if (Notifications && note?.notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(note.notificationId);
    } catch {
      // already cancelled
    }
  }
  await upsertNote({ id: noteId, notificationId: null, reminderAt: null });
}

/** Re-register all future reminders (e.g. after app restart or OS cleared alarms). */
export async function rescheduleAllReminders(): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  if (!(await requestNotificationPermissions())) return;

  await setupAndroidChannel(await getAlarmToneId());
  const now = Date.now();
  const notes = await listNotes();

  for (const n of notes) {
    if (n.completed || !n.reminderAt || n.reminderAt <= now) continue;
    await scheduleNoteReminder(n.id, n.title, n.reminderAt);
  }
}

export async function initNotificationListeners(
  onOpenNote: (noteId: string) => void
): Promise<() => void> {
  const Notifications = await getNotifications();
  if (!Notifications) return () => {};

  const received = Notifications.addNotificationReceivedListener(async () => {
    const toneId = await getAlarmToneId();
    if (shouldPlayFullAlarmInApp(toneId)) {
      await playAlarmRingtone(toneId);
    }
  });

  const response = Notifications.addNotificationResponseReceivedListener(res => {
    stopAlarmRingtone();
    const noteId = res.notification.request.content.data?.noteId;
    if (typeof noteId === 'string') onOpenNote(noteId);
  });

  return () => {
    received.remove();
    response.remove();
  };
}

export function reminderEnvironmentHint(): string | null {
  if (isExpoGo()) {
    return 'Alarms need a dev build. Run: npm run android (Expo Go cannot play custom alarm tones).';
  }
  return null;
}
