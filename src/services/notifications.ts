import { Platform } from 'react-native';
import { upsertNote, getNote, listNotes } from '../storage/notes';

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
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
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

export async function setupAndroidChannel(): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications || Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Reminders',
    description: 'Note reminder alarms',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 400, 200, 400],
    enableVibrate: true,
    bypassDnd: false,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
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

  await setupAndroidChannel();

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

    const trigger: import('expo-notifications').DateTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(reminderAt),
      channelId: 'reminders',
    };

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Reminder',
        body: title?.trim() || 'You have a note reminder',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 400, 200, 400],
        data: { noteId },
        sticky: false,
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

  await setupAndroidChannel();
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

  const received = Notifications.addNotificationReceivedListener(() => {
    // foreground — handler above shows alert + sound
  });

  const response = Notifications.addNotificationResponseReceivedListener(res => {
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
    return 'Reminders need a dev build. Run: npm run android (Expo Go has limited alarm support).';
  }
  return null;
}
