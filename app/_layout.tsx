import 'react-native-gesture-handler';
import { Stack, useRouter } from 'expo-router';
import { AppThemeProvider } from '../src/theme/ThemeProvider';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  setupAndroidChannel,
  requestNotificationPermissions,
  initNotificationListeners,
  rescheduleAllReminders,
} from '../src/services/notifications';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      await setupAndroidChannel();
      await requestNotificationPermissions();
      await rescheduleAllReminders();
    })();

    let cleanup = () => {};
    initNotificationListeners(noteId => {
      router.push({ pathname: '/note', params: { id: noteId } });
    }).then(remove => {
      cleanup = remove;
    });

    return () => cleanup();
  }, [router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppThemeProvider>
          <StatusBar style="auto" />
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
