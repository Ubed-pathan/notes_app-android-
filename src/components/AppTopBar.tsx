import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  title: ReactNode;
  subtitle?: string;
  right?: ReactNode;
};

/** Top bar — safe area + standard Material app bar height (matches previous Paper Appbar) */
export function AppTopBar({ title, subtitle, right }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          paddingTop: insets.top,
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.outlineVariant,
        },
      ]}
    >
      <View style={[styles.row, subtitle ? styles.rowWithSubtitle : null]}>
        <View style={styles.titleWrap}>
          {typeof title === 'string' ? (
            <Text variant="titleLarge" style={styles.titleText} numberOfLines={1}>
              {title}
            </Text>
          ) : (
            title
          )}
          {subtitle ? (
            <Text variant="bodySmall" style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
    </View>
  );
}

const APP_BAR_HEIGHT = 56;
const APP_BAR_HEIGHT_SUBTITLE = 72;

const styles = StyleSheet.create({
  bar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  row: {
    height: APP_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 4,
  },
  rowWithSubtitle: {
    height: APP_BAR_HEIGHT_SUBTITLE,
    alignItems: 'center',
  },
  titleWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    minWidth: 0,
  },
  titleText: {
    fontWeight: '700',
  },
  subtitle: {
    opacity: 0.65,
    marginTop: 2,
  },
});
