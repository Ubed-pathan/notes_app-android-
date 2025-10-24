import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { AppThemeProvider } from '../src/theme/ThemeProvider';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  useEffect(() => {
    // Any splash/config hooks
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppThemeProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ title: 'Notes' }} />
            <Stack.Screen name="note" options={{ title: 'Edit Note', presentation: 'card' }} />
            <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          </Stack>
        </AppThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
