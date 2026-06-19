import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Chip, Divider, Switch, Text, useTheme } from 'react-native-paper';
import {
  DEFAULT_SNOOZE_MINUTES,
  SNOOZE_MINUTE_OPTIONS,
  getSnoozeEnabled,
  getSnoozeMinutes,
  setSnoozeEnabled,
  setSnoozeMinutes,
} from '../storage/reminderSettings';
import { setupNotificationCategories } from '../services/notifications';

export function SnoozeSettings() {
  const theme = useTheme();
  const [enabled, setEnabled] = useState(true);
  const [minutes, setMinutes] = useState(DEFAULT_SNOOZE_MINUTES);

  const load = useCallback(async () => {
    const [on, mins] = await Promise.all([getSnoozeEnabled(), getSnoozeMinutes()]);
    setEnabled(on);
    setMinutes(mins);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleEnabled = async (value: boolean) => {
    setEnabled(value);
    await setSnoozeEnabled(value);
    await setupNotificationCategories();
  };

  const pickMinutes = async (value: number) => {
    setMinutes(value);
    await setSnoozeMinutes(value);
    await setupNotificationCategories();
  };

  return (
    <View style={{ paddingHorizontal: 8, paddingTop: 4, paddingBottom: 12 }}>
      <Divider style={{ opacity: 0.1, marginBottom: 12 }} />
      <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: 4, paddingHorizontal: 8 }}>
        Snooze
      </Text>
      <Text variant="bodySmall" style={{ opacity: 0.65, marginBottom: 12, paddingHorizontal: 8 }}>
        When an alarm rings, tap Snooze on the notification to ring again after the interval below.
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 8,
          marginBottom: enabled ? 12 : 0,
        }}
      >
        <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
          Enable snooze
        </Text>
        <Switch value={enabled} onValueChange={toggleEnabled} color={theme.colors.primary} />
      </View>

      {enabled ? (
        <View style={{ paddingHorizontal: 8 }}>
          <Text variant="labelLarge" style={{ fontWeight: '600', marginBottom: 8 }}>
            Snooze interval
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SNOOZE_MINUTE_OPTIONS.map(option => (
              <Chip
                key={option}
                selected={minutes === option}
                onPress={() => pickMinutes(option)}
                style={{ borderRadius: 20 }}
              >
                {option} min
              </Chip>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
