import { PropsWithChildren } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = PropsWithChildren<{ style?: StyleProp<ViewStyle>; edges?: ('top' | 'bottom' | 'left' | 'right')[] }>;

/** Screen wrapper — tab screens use left/right only; AppTopBar handles the top inset */
export function Screen({ children, style, edges = ['left', 'right'] }: Props) {
  return (
    <SafeAreaView edges={edges} style={[{ flex: 1 }, style]}>
      {children}
    </SafeAreaView>
  );
}
