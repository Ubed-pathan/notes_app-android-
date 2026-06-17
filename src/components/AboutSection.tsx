import { View, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ABOUT_COLORS } from '../features/theme/aboutStyles';

type Props = {
  isDark: boolean;
  displayName: string;
  version: string;
};

function AboutChip({ label, icon, colors }: { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; colors: typeof ABOUT_COLORS.light }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.chipBackground,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 6,
        marginBottom: 6,
      }}
    >
      <MaterialCommunityIcons name={icon} size={16} color={colors.chipIcon} />
      <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: '600', color: colors.chipText }}>
        {label}
      </Text>
    </View>
  );
}

/** About block — 100% fixed colors, ignores custom accent palette */
export function AboutSection({ isDark, displayName, version }: Props) {
  const c = isDark ? ABOUT_COLORS.dark : ABOUT_COLORS.light;

  return (
    <View
      style={{
        marginTop: 12,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.2 : 0.06,
        shadowRadius: 3,
        elevation: 1,
      }}
    >
      <Text
        style={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 8,
          fontSize: 14,
          fontWeight: '600',
          color: c.subheader,
          letterSpacing: 0.4,
        }}
      >
        About
      </Text>

      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              marginRight: 12,
              overflow: 'hidden',
              backgroundColor: c.iconBackground,
            }}
          >
            <Image
              source={require('../../assets/icon-1024.png')}
              style={{ width: 48, height: 48 }}
              resizeMode="cover"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', letterSpacing: 2, fontSize: 16, color: c.title }}>
              {displayName}
            </Text>
            <Text style={{ color: c.body, fontSize: 12, marginTop: 4, lineHeight: 18 }}>
              This is a note app developed by{' '}
              <Text style={{ fontWeight: '800', color: c.title }}>Ubedullakhan Pathan</Text>.
            </Text>
            <Text style={{ color: c.bodyMuted, fontSize: 12, marginTop: 2 }}>
              v{version}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 }}>
          <AboutChip label="Offline" icon="check-circle-outline" colors={c} />
          <AboutChip label="Local storage" icon="database-outline" colors={c} />
        </View>
      </View>
    </View>
  );
}
