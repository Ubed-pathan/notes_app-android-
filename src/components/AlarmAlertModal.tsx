import { useEffect, useState } from 'react';
import { Modal, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ActiveAlarm, subscribeAlarmAlert } from '../services/alarmAlertBus';
import { getSnoozeEnabled, getSnoozeMinutes } from '../storage/reminderSettings';
import { snoozeNoteReminder, stopNoteAlarm } from '../services/notifications';

export function AlarmAlertModal() {
  const theme = useTheme();
  const router = useRouter();
  const [alarm, setAlarm] = useState<ActiveAlarm | null>(null);
  const [snoozeMinutes, setSnoozeMinutes] = useState(10);
  const [snoozeEnabled, setSnoozeEnabled] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return subscribeAlarmAlert(setAlarm);
  }, []);

  useEffect(() => {
    if (!alarm) return;
    (async () => {
      const [enabled, minutes] = await Promise.all([getSnoozeEnabled(), getSnoozeMinutes()]);
      setSnoozeEnabled(enabled);
      setSnoozeMinutes(minutes);
    })();
  }, [alarm]);

  if (!alarm) return null;

  const onStop = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await stopNoteAlarm(alarm.noteId, alarm.notificationId);
    } finally {
      setBusy(false);
    }
  };

  const onSnooze = async () => {
    if (busy || !snoozeEnabled) return;
    setBusy(true);
    try {
      await snoozeNoteReminder(alarm.noteId, alarm.title, alarm.notificationId);
    } finally {
      setBusy(false);
    }
  };

  const onOpenNote = () => {
    router.push({ pathname: '/note', params: { id: alarm.noteId } });
    stopNoteAlarm(alarm.noteId, alarm.notificationId);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onStop}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.72)',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 24,
            padding: 24,
            elevation: 8,
          }}
        >
          <Text variant="headlineSmall" style={{ fontWeight: '800', marginBottom: 8 }}>
            ⏰ Alarm
          </Text>
          <Text variant="titleMedium" style={{ marginBottom: 20, fontWeight: '600' }}>
            {alarm.title || 'Note reminder'}
          </Text>

          <Button
            mode="contained"
            icon="stop-circle-outline"
            onPress={onStop}
            loading={busy}
            style={{ marginBottom: 10, borderRadius: 12 }}
            buttonColor={theme.colors.error}
            textColor={theme.colors.onError}
          >
            Stop
          </Button>

          {snoozeEnabled ? (
            <Button
              mode="contained-tonal"
              icon="alarm-snooze"
              onPress={onSnooze}
              disabled={busy}
              style={{ marginBottom: 10, borderRadius: 12 }}
            >
              Snooze {snoozeMinutes} min
            </Button>
          ) : null}

          <Button mode="text" onPress={onOpenNote} disabled={busy} style={{ borderRadius: 12 }}>
            Open note
          </Button>
        </View>
      </View>
    </Modal>
  );
}
