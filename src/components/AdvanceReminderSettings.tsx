import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Divider, Switch, Text, useTheme } from 'react-native-paper';
import {
  UPCOMING_REMINDER_MINUTES,
  getAdvanceReminderEnabled,
  setAdvanceReminderEnabled,
} from '../storage/reminderSettings';
import { rescheduleAllReminders } from '../services/notifications';

export function AdvanceReminderSettings() {
  const theme = useTheme();
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setEnabled(await getAdvanceReminderEnabled());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (value: boolean) => {
    if (busy) return;
    setBusy(true);
    setEnabled(value);
    try {
      await setAdvanceReminderEnabled(value);
      await rescheduleAllReminders();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ paddingHorizontal: 8, paddingTop: 4, paddingBottom: 12 }}>
      <Divider style={{ opacity: 0.1, marginBottom: 12 }} />
      <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: 4, paddingHorizontal: 8 }}>
        Early heads-up
      </Text>
      <Text variant="bodySmall" style={{ opacity: 0.65, marginBottom: 12, paddingHorizontal: 8 }}>
        A gentle notification {UPCOMING_REMINDER_MINUTES} minutes before your alarm, so you can prepare.
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 8,
        }}
      >
        <Text variant="bodyMedium" style={{ fontWeight: '600', flex: 1, paddingRight: 12 }}>
          Notify {UPCOMING_REMINDER_MINUTES} min before
        </Text>
        <Switch
          value={enabled}
          onValueChange={toggle}
          disabled={busy}
          color={theme.colors.primary}
        />
      </View>
    </View>
  );
}
