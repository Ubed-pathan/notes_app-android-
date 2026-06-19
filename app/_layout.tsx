import 'react-native-gesture-handler';
import { Stack, useRouter } from 'expo-router';
import { AppThemeProvider } from '../src/theme/ThemeProvider';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlarmAlertModal } from '../src/components/AlarmAlertModal';
import {
  setupAndroidChannel,
  setupUpcomingAndroidChannel,
  requestNotificationPermissions,
  initNotificationListeners,
  rescheduleAllReminders,
  setupNotificationCategories,
  resumeActiveAlarmIfNeeded,
} from '../src/services/notifications';

export default function RootLayout() {
  const router = useRouter();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    (async () => {
      await setupAndroidChannel();
      await setupUpcomingAndroidChannel();
      await setupNotificationCategories();
      await requestNotificationPermissions();
      await rescheduleAllReminders();
    })();

    let cleanup = () => {};
    initNotificationListeners(noteId => {
      router.push({ pathname: '/note', params: { id: noteId } });
    }).then(remove => {
      cleanup = remove;
    });

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        void resumeActiveAlarmIfNeeded();
      }
      appState.current = next;
    });

    return () => {
      cleanup();
      sub.remove();
    };
  }, [router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppThemeProvider>
          <StatusBar style="auto" />
          <AlarmAlertModal />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="note" options={{ title: 'Edit Note', presentation: 'card' }} />
            <Stack.Screen name="settings" options={{ title: 'Settings', presentation: 'card' }} />
          </Stack>
        </AppThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
