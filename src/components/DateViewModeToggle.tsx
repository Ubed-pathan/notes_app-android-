import { Pressable, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import * as Haptics from 'expo-haptics';

export type DateViewMode = 'due' | 'created';

type Props = {
  value: DateViewMode;
  onChange: (mode: DateViewMode) => void;
};

const OPTIONS: { key: DateViewMode; label: string }[] = [
  { key: 'due', label: 'Due date' },
  { key: 'created', label: 'Created' },
];

export function DateViewModeToggle({ value, onChange }: Props) {
  const theme = useTheme();

  const onSelect = (mode: DateViewMode) => {
    if (mode === value) return;
    onChange(mode);
    Haptics.selectionAsync();
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.colors.surfaceVariant,
        borderRadius: 12,
        padding: 3,
        marginBottom: 12,
      }}
    >
      {OPTIONS.map(option => {
        const selected = value === option.key;
        return (
          <Pressable
            key={option.key}
            onPress={() => onSelect(option.key)}
            style={{
              flex: 1,
              paddingVertical: 8,
              paddingHorizontal: 10,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor: selected ? theme.colors.surface : 'transparent',
              elevation: selected ? 1 : 0,
            }}
          >
            <Text
              variant="labelMedium"
              style={{
                fontWeight: selected ? '700' : '500',
                color: selected ? theme.colors.primary : theme.colors.onSurfaceVariant,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
