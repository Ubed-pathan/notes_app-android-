import { Platform } from 'react-native';
import { upsertNote, getNote, listNotes } from '../storage/notes';
import { getSnoozeEnabled, getSnoozeMinutes, getAdvanceReminderEnabled, UPCOMING_REMINDER_MINUTES } from '../storage/reminderSettings';
import { getReminderChannelId } from '../constants/alarmTones';
import { CUSTOM_ALARM_CHANNEL_ID, resolveAlarmNotificationSound } from './customAlarmSound';
import { playAlarmRingtone, stopAlarmRingtone } from './alarmPlayback';
import { clearAlarmAlert, showAlarmAlert } from './alarmAlertBus';
export { registerAlarmBackgroundTask } from './alarmBackgroundTask';


type NotificationsModule = typeof import('expo-notifications');

let notificationsModule: NotificationsModule | null | undefined;
let handlerConfigured = false;
let initPromise: Promise<NotificationsModule | null> | null = null;

export type ScheduleResult =
  | { ok: true; id: string }
  | { ok: false; reason: string; message: string };

export const UPCOMING_REMINDER_CHANNEL_ID = 'reminders-upcoming-v2';
const NOTIFICATION_ACCENT = '#6750A4';
const UPCOMING_REMINDER_MS = UPCOMING_REMINDER_MINUTES * 60 * 1000;

import { isExpoGo } from '../utils/isExpoGo';

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
          handleNotification: async notification => {
            const data = notification.request.content.data;
            if (data?.isUpcoming === true) {
              return {
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
                shouldShowBanner: true,
                shouldShowList: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
              };
            }

            return {
              shouldShowAlert: true,
              shouldPlaySound: true,
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

export async function setupNotificationCategories(): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  const minutes = await getSnoozeMinutes();
  const enabled = await getSnoozeEnabled();

  const actions: import('expo-notifications').NotificationAction[] = [
    {
      identifier: 'stop',
      buttonTitle: 'Stop',
      options: { opensAppToForeground: true },
    },
  ];
  if (enabled) {
    actions.push({
      identifier: 'snooze',
      buttonTitle: `Snooze ${minutes}m`,
      options: { opensAppToForeground: true },
    });
  }

  await Notifications.setNotificationCategoryAsync('reminder-alarm', actions);

  await Notifications.setNotificationCategoryAsync('reminder-upcoming', [
    {
      identifier: 'open',
      buttonTitle: 'Open note',
      options: { opensAppToForeground: true },
    },
  ]);
}

function formatReminderTime(reminderAt: number): string {
  const d = new Date(reminderAt);
  const now = new Date();
  const timeStr = d.toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' });

  if (d.toDateString() === now.toDateString()) return `Today at ${timeStr}`;

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow at ${timeStr}`;

  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function buildUpcomingNotificationContent(
  noteId: string,
  title: string,
  reminderAt: number
): Omit<import('expo-notifications').NotificationContentInput, 'priority'> {
  const noteTitle = title?.trim() || 'Note reminder';
  const when = formatReminderTime(reminderAt);

  return {
    title: `📌 ${UPCOMING_REMINDER_MINUTES} min until reminder`,
    subtitle: 'AL-KITAB',
    body: `${noteTitle}\n\n🕐 ${when}\n✨ Your alarm is coming soon — get ready!`,
    sound: 'classic_alarm.wav',
    color: NOTIFICATION_ACCENT,
    vibrate: [0, 180, 120, 180],
    data: { noteId, isUpcoming: true, noteTitle, reminderAt },
    categoryIdentifier: 'reminder-upcoming',
    ...(Platform.OS === 'ios' ? { interruptionLevel: 'active' as const } : {}),
  };
}

async function cancelScheduledNotifications(
  Notifications: NotificationsModule,
  ids: (string | null | undefined)[]
): Promise<void> {
  for (const id of ids) {
    if (!id) continue;
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // already cancelled
    }
  }
}

export async function setupUpcomingAndroidChannel(): Promise<string> {
  const Notifications = await getNotifications();
  if (!Notifications || Platform.OS !== 'android') return UPCOMING_REMINDER_CHANNEL_ID;

  await Notifications.setNotificationChannelAsync(UPCOMING_REMINDER_CHANNEL_ID, {
    name: 'Early reminder',
    description: `Gentle heads-up ${UPCOMING_REMINDER_MINUTES} minutes before alarms`,
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'classic_alarm.wav',
    vibrationPattern: [0, 180, 120, 180],
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    lightColor: NOTIFICATION_ACCENT,
  });

  return UPCOMING_REMINDER_CHANNEL_ID;
}

export async function stopNoteAlarm(noteId: string, notificationId?: string): Promise<void> {
  stopAlarmRingtone();
  clearAlarmAlert();

  const Notifications = await getNotifications();
  const note = await getNote(noteId);

  if (Notifications) {
    const ids = [notificationId, note?.notificationId, note?.upcomingNotificationId].filter(
      Boolean
    ) as string[];
    for (const id of ids) {
      try {
        await Notifications.dismissNotificationAsync(id);
      } catch {
        // ignore
      }
    }
  }

  await upsertNote({ id: noteId, notificationId: null });
}

export async function snoozeNoteReminder(
  noteId: string,
  title: string,
  notificationId?: string
): Promise<ScheduleResult> {
  const enabled = await getSnoozeEnabled();
  if (!enabled) {
    return { ok: false, reason: 'disabled', message: 'Snooze is turned off in Settings.' };
  }

  await stopNoteAlarm(noteId, notificationId);
  const minutes = await getSnoozeMinutes();
  const at = Date.now() + minutes * 60 * 1000;
  return scheduleNoteReminder(noteId, title, at);
}

export async function setupAndroidChannel(): Promise<string> {
  const Notifications = await getNotifications();
  if (!Notifications || Platform.OS !== 'android') return CUSTOM_ALARM_CHANNEL_ID;

  const channelId = getReminderChannelId();
  const sound = await resolveAlarmNotificationSound();

  try {
    await Notifications.deleteNotificationChannelAsync(channelId);
  } catch {
    // ignore
  }

  await Notifications.setNotificationChannelAsync(channelId, {
    name: 'Alarms · My tone',
    description: 'Note reminder alarms — uses your tone and alarm volume',
    importance: Notifications.AndroidImportance.MAX,
    sound: typeof sound === 'string' ? sound : undefined,
    vibrationPattern: [0, 800, 300, 800, 300, 800, 300, 800],
    enableVibrate: true,
    bypassDnd: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    showBadge: true,
    enableLights: true,
    lightColor: NOTIFICATION_ACCENT,
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
    await cancelScheduledNotifications(Notifications, [
      note?.notificationId,
      note?.upcomingNotificationId,
    ]);

    const channelId = await setupAndroidChannel();
    const sound = await resolveAlarmNotificationSound();
    await setupNotificationCategories();
    await setupUpcomingAndroidChannel();

    const noteTitle = title?.trim() || 'Note reminder';
    let upcomingNotificationId: string | null = null;

    const advanceEnabled = await getAdvanceReminderEnabled();
    const upcomingAt = reminderAt - UPCOMING_REMINDER_MS;
    if (advanceEnabled && upcomingAt > Date.now()) {
      const upcomingTrigger: import('expo-notifications').DateTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(upcomingAt),
        channelId: UPCOMING_REMINDER_CHANNEL_ID,
      };

      upcomingNotificationId = await Notifications.scheduleNotificationAsync({
        content: {
          ...buildUpcomingNotificationContent(noteId, noteTitle, reminderAt),
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: upcomingTrigger,
      });
    }

    const trigger: import('expo-notifications').DateTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(reminderAt),
      channelId,
    };

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Alarm',
        body: noteTitle,
        sound: sound ?? 'classic_alarm.wav',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 600, 200, 600, 200, 600],
        color: NOTIFICATION_ACCENT,
        data: { noteId, isAlarm: true, noteTitle },
        sticky: true,
        categoryIdentifier: 'reminder-alarm',
        ...(Platform.OS === 'ios'
          ? { interruptionLevel: 'timeSensitive' as const }
          : {}),
      },
      trigger,
    });

    await upsertNote({
      id: noteId,
      notificationId: id,
      upcomingNotificationId,
      reminderAt,
    });
    return { ok: true, id };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to schedule reminder.';
    return { ok: false, reason: 'error', message };
  }
}

export async function cancelNoteReminder(noteId: string): Promise<void> {
  const Notifications = await getNotifications();
  const note = await getNote(noteId);
  if (Notifications) {
    await cancelScheduledNotifications(Notifications, [
      note?.notificationId,
      note?.upcomingNotificationId,
    ]);
  }
  await upsertNote({
    id: noteId,
    notificationId: null,
    upcomingNotificationId: null,
    reminderAt: null,
  });
}

/** Re-register future reminders only when OS cleared them (e.g. after reboot). */
export async function rescheduleAllReminders(): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  if (!(await requestNotificationPermissions())) return;

  await setupAndroidChannel();
  await setupUpcomingAndroidChannel();
  const now = Date.now();
  const notes = await listNotes();

  let scheduledIds = new Set<string>();
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    scheduledIds = new Set(scheduled.map(s => s.identifier));
  } catch {
    // If we cannot read scheduled notifications, reschedule everything below.
  }

  for (const n of notes) {
    if (n.completed || !n.reminderAt || n.reminderAt <= now) continue;

    const hasMain = Boolean(n.notificationId && scheduledIds.has(n.notificationId));
    const upcomingOk =
      !n.upcomingNotificationId || scheduledIds.has(n.upcomingNotificationId);
    if (hasMain && upcomingOk) continue;

    await scheduleNoteReminder(n.id, n.title, n.reminderAt);
  }
}

/** Handle alarm notification — show modal + play ringtone (foreground or background). */
export async function handleAlarmNotification(
  notification: import('expo-notifications').Notification
): Promise<void> {
  const data = notification.request.content.data;
  if (data?.isUpcoming === true || data?.isAlarm !== true) return;

  const noteId = data?.noteId;
  if (typeof noteId !== 'string') return;

  const title =
    (typeof data?.noteTitle === 'string' && data.noteTitle) ||
    notification.request.content.body ||
    'Note reminder';

  showAlarmAlert({
    noteId,
    title,
    notificationId: notification.request.identifier,
  });

  await playAlarmRingtone();
}

/** When app returns to foreground, resume alarm if notification is still showing. */
export async function resumeActiveAlarmIfNeeded(): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  const presented = await Notifications.getPresentedNotificationsAsync();
  const alarmNotification = presented.find(n => n.request.content.data?.isAlarm === true);
  if (!alarmNotification) return;

  await handleAlarmNotification(alarmNotification);
}

export async function initNotificationListeners(
  onOpenNote?: (noteId: string) => void
): Promise<() => void> {
  const Notifications = await getNotifications();
  if (!Notifications) return () => {};

  const received = Notifications.addNotificationReceivedListener(async notification => {
    const data = notification.request.content.data;
    if (data?.isUpcoming === true) return;
    if (data?.isAlarm === true) {
      await handleAlarmNotification(notification);
    }
  });

  const response = Notifications.addNotificationResponseReceivedListener(async res => {
    const NotificationsMod = await getNotifications();
    const data = res.notification.request.content.data;
    const noteId = data?.noteId;
    if (typeof noteId !== 'string') return;

    const title =
      (typeof data?.noteTitle === 'string' && data.noteTitle) ||
      res.notification.request.content.body ||
      '';
    const notificationId = res.notification.request.identifier;
    const action = res.actionIdentifier;
    const defaultAction =
      NotificationsMod?.DEFAULT_ACTION_IDENTIFIER &&
      action === NotificationsMod.DEFAULT_ACTION_IDENTIFIER;

    if (data?.isUpcoming === true) {
      if (action === 'open' || defaultAction) {
        onOpenNote?.(noteId);
      }
      return;
    }

    if (action === 'stop') {
      await stopNoteAlarm(noteId, notificationId);
      return;
    }

    if (action === 'snooze') {
      await snoozeNoteReminder(noteId, title, notificationId);
      return;
    }

    if (defaultAction) {
      await handleAlarmNotification(res.notification);
      return;
    }

    if (action === 'open') {
      stopAlarmRingtone();
      clearAlarmAlert();
      onOpenNote?.(noteId);
    }
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
