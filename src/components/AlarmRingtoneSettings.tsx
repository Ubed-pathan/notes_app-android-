import { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { Button, Divider, Text } from 'react-native-paper';
import {
  getCustomAlarmTone,
  pickAndSaveCustomAlarmTone,
} from '../storage/reminderSettings';
import { rescheduleAllReminders } from '../services/notifications';
import { previewCustomAlarmTone, stopAlarmRingtone } from '../services/alarmPlayback';
import { openBatterySettings, openExactAlarmSettings } from '../services/exactAlarm';
import { SnoozeSettings } from './SnoozeSettings';
import { AdvanceReminderSettings } from './AdvanceReminderSettings';

export function AlarmRingtoneSettings() {
  const [customName, setCustomName] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [picking, setPicking] = useState(false);

  const load = useCallback(async () => {
    const custom = await getCustomAlarmTone();
    setCustomName(custom?.name ?? null);
  }, []);

  useEffect(() => {
    load();
    return () => {
      stopAlarmRingtone();
    };
  }, [load]);

  const stopPreview = useCallback(async () => {
    await stopAlarmRingtone();
    setPreviewing(false);
  }, []);

  const listenToCustomTone = useCallback(async () => {
    if (!customName) {
      Alert.alert('No tone yet', 'Tap “Choose audio file” to add your alarm sound first.');
      return;
    }

    if (previewing) {
      await stopPreview();
      return;
    }

    setPreviewing(true);
    try {
      const sound = await previewCustomAlarmTone();
      if (!sound) {
        setPreviewing(false);
        Alert.alert('Cannot play tone', 'The saved file was not found. Please choose it again.');
      }
    } catch {
      setPreviewing(false);
      Alert.alert('Playback failed', 'Could not play this audio file. Try MP3, WAV, or M4A.');
    }
  }, [customName, previewing, stopPreview]);

  const pickCustomTone = useCallback(async () => {
    setPicking(true);
    try {
      const custom = await pickAndSaveCustomAlarmTone();
      if (!custom) return;
      setCustomName(custom.name);
      await rescheduleAllReminders();
      Alert.alert(
        'Tone saved',
        'Your alarm tone is set. Rebuild the APK (expo prebuild) so background ringing works on Android.'
      );
    } catch {
      Alert.alert('Import failed', 'Could not save that audio file. Try MP3, WAV, or M4A.');
    } finally {
      setPicking(false);
    }
  }, []);

  return (
    <View>
      <Text variant="bodySmall" style={{ opacity: 0.65, marginBottom: 12, paddingHorizontal: 4 }}>
        Reminders use your own audio file. It loops until you tap Stop or Snooze.
      </Text>

      <View style={{ paddingHorizontal: 4, paddingBottom: 12, gap: 8 }}>
        <Text variant="titleSmall" style={{ fontWeight: '700' }}>
          {customName ? `My tone · ${customName}` : 'My tone'}
        </Text>
        <Text variant="bodySmall" style={{ opacity: 0.6 }}>
          {customName ? 'Tap below to change or listen' : 'Choose an audio file from your phone'}
        </Text>

        <Button
          mode="contained-tonal"
          icon="folder-music-outline"
          loading={picking}
          onPress={pickCustomTone}
        >
          {customName ? 'Change audio file' : 'Choose audio file'}
        </Button>

        {customName ? (
          <Button
            mode="contained"
            icon={previewing ? 'stop' : 'volume-high'}
            onPress={listenToCustomTone}
          >
            {previewing ? 'Stop listening' : 'Listen to my tone'}
          </Button>
        ) : null}
      </View>

      <Divider style={{ opacity: 0.1, marginVertical: 8 }} />

      <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: 8, paddingHorizontal: 4 }}>
        On-time alarms (Android)
      </Text>
      <Text variant="bodySmall" style={{ opacity: 0.65, marginBottom: 8, paddingHorizontal: 4 }}>
        Allow exact alarms and disable battery optimization so reminders ring at the right time with sound.
      </Text>
      <View style={{ paddingHorizontal: 4, gap: 8, marginBottom: 8 }}>
        <Button mode="outlined" icon="alarm-check" onPress={() => openExactAlarmSettings()}>
          Allow exact alarms
        </Button>
        <Button mode="outlined" icon="battery-heart-outline" onPress={() => openBatterySettings()}>
          Battery optimization
        </Button>
      </View>

      <SnoozeSettings />
      <AdvanceReminderSettings />
    </View>
  );
}
