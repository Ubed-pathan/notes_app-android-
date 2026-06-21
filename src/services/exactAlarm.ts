import { Linking, Platform } from 'react-native';

const PACKAGE = 'com.notesapp.localnotes';

/** Open Android "Alarms & reminders" permission so reminders fire on time. */
export async function openExactAlarmSettings(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    const IntentLauncher = await import('expo-intent-launcher');
    await IntentLauncher.startActivityAsync(
      'android.settings.REQUEST_SCHEDULE_EXACT_ALARM',
      { data: `package:${PACKAGE}` }
    );
    return;
  } catch {
    // fall through
  }

  try {
    await Linking.openSettings();
  } catch {
    // ignore
  }
}

export async function openBatterySettings(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const IntentLauncher = await import('expo-intent-launcher');
    await IntentLauncher.startActivityAsync('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS');
  } catch {
    try {
      await Linking.openSettings();
    } catch {
      // ignore
    }
  }
}
