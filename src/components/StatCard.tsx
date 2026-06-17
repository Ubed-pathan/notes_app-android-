import { View } from 'react-native';
import { Surface, Text, useTheme } from 'react-native-paper';

type Props = {
  icon: string;
  label: string;
  value: string | number;
  color?: string;
};

export function StatCard({ icon, label, value, color }: Props) {
  const theme = useTheme();
  const accent = color ?? theme.colors.primary;

  return (
    <Surface
      style={{
        flex: 1,
        minWidth: '45%',
        padding: 16,
        borderRadius: 16,
        backgroundColor: theme.colors.surface,
        elevation: 2,
        borderLeftWidth: 4,
        borderLeftColor: accent,
      }}
    >
      <Text style={{ fontSize: 22, marginBottom: 4 }}>{icon}</Text>
      <Text variant="headlineSmall" style={{ fontWeight: '800', color: accent }}>
        {value}
      </Text>
      <Text variant="labelMedium" style={{ opacity: 0.65, marginTop: 2 }}>
        {label}
      </Text>
    </Surface>
  );
}
