import { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { Button, Divider, IconButton, List, RadioButton, Text, useTheme } from 'react-native-paper';
import { ALARM_TONES, AlarmToneId } from '../constants/alarmTones';
import {
  getAlarmToneId,
  getCustomAlarmTone,
  pickAndSaveCustomAlarmTone,
  setAlarmToneId,
} from '../storage/reminderSettings';
import { rescheduleAllReminders } from '../services/notifications';
import { previewAlarmRingtone, stopAlarmRingtone } from '../services/alarmPlayback';

export function AlarmRingtoneSettings() {
  const theme = useTheme();
  const [selected, setSelected] = useState<AlarmToneId>('classic_alarm');
  const [customName, setCustomName] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<AlarmToneId | null>(null);
  const [picking, setPicking] = useState(false);

  const load = useCallback(async () => {
    const [id, custom] = await Promise.all([getAlarmToneId(), getCustomAlarmTone()]);
    setSelected(id);
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
    setPreviewing(null);
  }, []);

  const previewTone = useCallback(
    async (id: AlarmToneId) => {
      if (id === 'default') return;
      if (id === 'custom' && !customName) {
        Alert.alert('No custom tone', 'Pick an audio file first.');
        return;
      }

      if (previewing === id) {
        await stopPreview();
        return;
      }

      await stopPreview();
      setPreviewing(id);
      try {
        const sound = await previewAlarmRingtone(id);
        if (!sound) {
          setPreviewing(null);
          return;
        }
        sound.setOnPlaybackStatusUpdate(status => {
          if (status.isLoaded && status.didJustFinish) {
            stopPreview();
          }
        });
      } catch {
        setPreviewing(null);
        Alert.alert('Preview failed', 'Could not play this tone.');
      }
    },
    [customName, previewing, stopPreview]
  );

  const selectTone = useCallback(
    async (id: AlarmToneId) => {
      if (id === 'custom' && !customName) {
        Alert.alert('Pick a tone first', 'Use “Choose audio file” to select your alarm sound.');
        return;
      }
      setSelected(id);
      await setAlarmToneId(id);
      await rescheduleAllReminders();
    },
    [customName]
  );

  const pickCustomTone = useCallback(async () => {
    setPicking(true);
    try {
      const custom = await pickAndSaveCustomAlarmTone();
      if (!custom) return;
      setCustomName(custom.name);
      setSelected('custom');
      await rescheduleAllReminders();
    } catch {
      Alert.alert('Import failed', 'Could not save that audio file. Try another format (MP3, WAV, M4A).');
    } finally {
      setPicking(false);
    }
  }, []);

  return (
    <View>
      <Text variant="bodySmall" style={{ opacity: 0.65, marginBottom: 8, paddingHorizontal: 4 }}>
        Reminders ring as full-length alarms. Built-in tones play completely (~6 seconds). Your own tone loops until
        you open the alarm.
      </Text>
      <RadioButton.Group onValueChange={v => selectTone(v as AlarmToneId)} value={selected}>
        {ALARM_TONES.map((tone, index) => (
          <View key={tone.id}>
            {index > 0 ? <Divider style={{ opacity: 0.1 }} /> : null}
            <List.Item
              title={tone.id === 'custom' && customName ? `My tone · ${customName}` : tone.label}
              description={
                tone.id === 'custom' && customName
                  ? 'Your chosen audio file (loops on alarm)'
                  : tone.description
              }
              left={props => (
                <List.Icon {...props} icon={tone.id === 'custom' ? 'music-box-outline' : 'alarm'} />
              )}
              onPress={() => selectTone(tone.id)}
              right={() => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {tone.id !== 'default' ? (
                    <IconButton
                      icon={previewing === tone.id ? 'stop' : 'play-circle-outline'}
                      size={22}
                      onPress={() => previewTone(tone.id)}
                    />
                  ) : null}
                  <RadioButton value={tone.id} color={theme.colors.primary} />
                </View>
              )}
            />
            {tone.id === 'custom' ? (
              <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                <Button
                  mode="contained-tonal"
                  icon="folder-music-outline"
                  loading={picking}
                  onPress={pickCustomTone}
                >
                  Choose audio file
                </Button>
              </View>
            ) : null}
          </View>
        ))}
      </RadioButton.Group>
    </View>
  );
}
