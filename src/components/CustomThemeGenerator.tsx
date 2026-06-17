import { useCallback, useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { Button, Divider, Text, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../theme/ThemeProvider';
import { ThemePalette } from '../features/theme/colorUtils';
import { ColorPickerModal } from './ColorPickerModal';

type Preset = { name: string } & ThemePalette;

const PROFESSIONAL_PRESETS: Preset[] = [
  { name: 'AL-KITAB Default', primary: '#5b4fcf', accentSecondary: '#625b71', alertOptions: '#e53935' },
  { name: 'Emerald', primary: '#10b981', accentSecondary: '#4f46e5', alertOptions: '#9d174d' },
  { name: 'Modern Blue', primary: '#3b82f6', accentSecondary: '#6366f1', alertOptions: '#ef4444' },
  { name: 'Elegant Purple', primary: '#8b5cf6', accentSecondary: '#a855f7', alertOptions: '#ec4899' },
  { name: 'Corporate Green', primary: '#059669', accentSecondary: '#0d9488', alertOptions: '#dc2626' },
  { name: 'Sunset Warm', primary: '#f97316', accentSecondary: '#eab308', alertOptions: '#b91c1c' },
];

type ColorField = keyof ThemePalette;

const FIELD_LABELS: Record<ColorField, string> = {
  primary: 'Primary',
  accentSecondary: 'Accent',
  alertOptions: 'Alert',
};

/** Circular swatch like HTML `<input type="color" />` */
function ColorInput({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text variant="labelSmall" style={{ fontWeight: '700', marginBottom: 8, opacity: 0.75 }}>
        {label}
      </Text>
      <Pressable
        onPress={onPress}
        accessibilityLabel={`${label} color`}
        style={({ pressed }) => ({
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        })}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: value,
            borderWidth: 2,
            borderColor: theme.colors.outlineVariant,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 3,
          }}
        />
      </Pressable>
      <Text variant="labelSmall" style={{ marginTop: 6, opacity: 0.55, fontSize: 10 }}>
        {value.toUpperCase()}
      </Text>
    </View>
  );
}

export function CustomThemeGenerator() {
  const theme = useTheme();
  const { palette, setPalette, randomizePalette, resetPalette } = useAppTheme();
  const [pickerField, setPickerField] = useState<ColorField | null>(null);

  const updateField = useCallback(
    (field: ColorField, hex: string) => {
      setPalette({ ...palette, [field]: hex });
    },
    [palette, setPalette]
  );

  const applyPreset = (preset: Preset) => {
    setPalette({
      primary: preset.primary,
      accentSecondary: preset.accentSecondary,
      alertOptions: preset.alertOptions,
    });
  };

  return (
    <View>
      <LinearGradient
        colors={[palette.primary, palette.accentSecondary, palette.alertOptions]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          height: 8,
          borderRadius: 4,
          marginBottom: 16,
          opacity: 0.9,
        }}
      />

      <Text variant="bodySmall" style={{ opacity: 0.65, marginBottom: 16, textAlign: 'center' }}>
        Tap a color circle to open the picker.
      </Text>

      <View style={{ flexDirection: 'row', marginBottom: 20, paddingHorizontal: 8 }}>
        <ColorInput label="Primary" value={palette.primary} onPress={() => setPickerField('primary')} />
        <ColorInput label="Accent" value={palette.accentSecondary} onPress={() => setPickerField('accentSecondary')} />
        <ColorInput label="Alert" value={palette.alertOptions} onPress={() => setPickerField('alertOptions')} />
      </View>

      <Divider style={{ marginBottom: 14, opacity: 0.15 }} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
        {PROFESSIONAL_PRESETS.map(p => (
          <Pressable key={p.name} onPress={() => applyPreset(p)}>
            <LinearGradient
              colors={[p.primary, p.accentSecondary, p.alertOptions]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                width: 72,
                height: 36,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: theme.colors.outlineVariant,
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff', textShadowColor: '#000', textShadowRadius: 4 }}>
                {p.name.split(' ')[0]}
              </Text>
            </LinearGradient>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
        <Button
          mode="contained"
          icon="dice-multiple"
          onPress={randomizePalette}
          style={{ borderRadius: 10 }}
          buttonColor={palette.primary}
        >
          Random
        </Button>
        <Button
          mode="contained"
          icon="restore"
          onPress={resetPalette}
          style={{ borderRadius: 10 }}
          buttonColor={palette.accentSecondary}
        >
          Reset
        </Button>
      </View>

      {pickerField ? (
        <ColorPickerModal
          visible
          title={`Pick ${FIELD_LABELS[pickerField]} color`}
          value={palette[pickerField]}
          onClose={() => setPickerField(null)}
          onConfirm={hex => updateField(pickerField, hex)}
        />
      ) : null}
    </View>
  );
}
