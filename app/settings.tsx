import { View, ScrollView } from 'react-native';
import { Appbar, List, RadioButton, Text, Surface, Divider, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../src/theme/ThemeProvider';
import { CustomThemeGenerator } from '../src/components/CustomThemeGenerator';
import { AlarmRingtoneSettings } from '../src/components/AlarmRingtoneSettings';
import { AboutSection } from '../src/components/AboutSection';
import Constants from 'expo-constants';

export default function SettingsScreen() {
  const router = useRouter();
  const { mode, setMode, isDark } = useAppTheme();
  const theme = useTheme();
  const rawName = (Constants?.expoConfig?.name || 'Al Kitab').toUpperCase();
  const parts = rawName.trim().split(/\s+/);
  const displayName = parts.length > 1 ? `${parts[0]}-${parts.slice(1).join('')}` : rawName.replace(/\s+/g, '');

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Settings" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 32 }}>
        <Surface style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: theme.colors.surface, elevation: 1 }}>
          <List.Section>
            <List.Subheader style={{ opacity: 0.8, paddingHorizontal: 16 }}>Appearance</List.Subheader>
            <RadioButton.Group onValueChange={v => setMode(v as 'system' | 'light' | 'dark')} value={mode}>
              <List.Item
                title="System"
                description="Match device theme"
                left={props => <List.Icon {...props} icon="theme-light-dark" />}
                onPress={() => setMode('system')}
                right={() => <RadioButton value="system" color={theme.colors.primary} />}
              />
              <Divider style={{ opacity: 0.1 }} />
              <List.Item
                title="Light"
                left={props => <List.Icon {...props} icon="white-balance-sunny" />}
                onPress={() => setMode('light')}
                right={() => <RadioButton value="light" color={theme.colors.primary} />}
              />
              <Divider style={{ opacity: 0.1 }} />
              <List.Item
                title="Dark"
                left={props => <List.Icon {...props} icon="moon-waning-crescent" />}
                onPress={() => setMode('dark')}
                right={() => <RadioButton value="dark" color={theme.colors.primary} />}
              />
            </RadioButton.Group>
          </List.Section>
        </Surface>

        <Surface style={{ marginTop: 12, borderRadius: 16, overflow: 'hidden', backgroundColor: theme.colors.surface, elevation: 1 }}>
          <List.Section>
            <List.Subheader style={{ opacity: 0.8, paddingHorizontal: 16 }}>Reminders & Alarms</List.Subheader>
            <View style={{ paddingHorizontal: 8, paddingBottom: 8 }}>
              <AlarmRingtoneSettings />
            </View>
          </List.Section>
        </Surface>

        <Surface style={{ marginTop: 12, borderRadius: 16, padding: 16, backgroundColor: theme.colors.surface, elevation: 1 }}>
          <Text variant="titleSmall" style={{ fontWeight: '800', marginBottom: 4 }}>
            Custom Accent Colors
          </Text>
          <CustomThemeGenerator />
        </Surface>

        <AboutSection
          isDark={isDark}
          displayName={displayName}
          version={Constants?.expoConfig?.version ?? '2.0.0'}
        />
      </ScrollView>
    </View>
  );
}
