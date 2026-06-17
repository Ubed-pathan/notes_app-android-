import { Stack } from 'expo-router';

export default function PrivateLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="setup" />
      <Stack.Screen name="notes" />
    </Stack>
  );
}
