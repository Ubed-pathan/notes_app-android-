import { View, ScrollView } from 'react-native';
import { Appbar, List, RadioButton, Text, Surface, Divider, useTheme, Avatar, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../src/theme/ThemeProvider';
import Constants from 'expo-constants';

export default function SettingsScreen() {
  const router = useRouter();
  const { mode, setMode } = useAppTheme();
  const theme = useTheme();
  const rawName = (Constants?.expoConfig?.name || 'Al Kitab').toUpperCase();
  const parts = rawName.trim().split(/\s+/);
  const displayName = parts.length > 1 ? `${parts[0]}-${parts.slice(1).join('')}` : rawName.replace(/\s+/g, '');
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Settings" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 32 }}>
        <Surface style={{ borderRadius: 12, overflow: 'hidden', backgroundColor: theme.colors.surface, elevation: 1 }}>
          <List.Section>
            <List.Subheader style={{ opacity: 0.8, paddingHorizontal: 16 }}>Theme</List.Subheader>
            <RadioButton.Group onValueChange={(v) => setMode(v as any)} value={mode}>
              <List.Item
                title="System"
                onPress={() => setMode('system')}
                right={() => <RadioButton value="system" color={theme.colors.primary} />}
              />
              <Divider style={{ opacity: 0.1 }} />
              <List.Item
                title="Light"
                onPress={() => setMode('light')}
                right={() => <RadioButton value="light" color={theme.colors.primary} />}
              />
              <Divider style={{ opacity: 0.1 }} />
              <List.Item
                title="Dark"
                onPress={() => setMode('dark')}
                right={() => <RadioButton value="dark" color={theme.colors.primary} />}
              />
            </RadioButton.Group>
          </List.Section>
        </Surface>

        <Surface style={{ marginTop: 12, borderRadius: 12, overflow: 'hidden', backgroundColor: theme.colors.surface, elevation: 1 }}>
          <List.Section>
            <List.Subheader style={{ opacity: 0.8, paddingHorizontal: 16 }}>About</List.Subheader>
            <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Avatar.Image size={48} source={require('../assets/icon-1024.png')} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text
                    variant="titleMedium"
                    style={{ fontWeight: '800', letterSpacing: 2 }}
                  >
                    {displayName}
                  </Text>
                  <Text variant="bodySmall" style={{ opacity: 0.8 }}>
                    This is a note app developed by <Text style={{ fontWeight: '800' }}>Ubedullakhan Pathan</Text>.
                  </Text>
                  <Text variant="bodySmall" style={{ opacity: 0.6, marginTop: 2 }}>
                    v{Constants?.expoConfig?.version || Constants?.manifest?.version || '1.0.0'}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 }}>
                <Chip style={{ marginRight: 6, marginBottom: 6 }} elevated icon="check-circle-outline">Offline</Chip>
                <Chip style={{ marginRight: 6, marginBottom: 6 }} elevated icon="database-outline">Local storage</Chip>
                {/* <Chip style={{ marginRight: 6, marginBottom: 6 }} elevated icon="cellphone">React Native</Chip> */}
              </View>
            </View>
          </List.Section>
        </Surface>
      </ScrollView>
    </View>
  );
}
