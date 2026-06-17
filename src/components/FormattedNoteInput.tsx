import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  TextInputProps,
  StyleProp,
  TextStyle,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { markdownToRich, richToMarkdown, updatePlainText, RichContent, RichText } from '../utils/richText';

const INPUT_METRICS: TextStyle = {
  fontSize: 16,
  lineHeight: 24,
  paddingHorizontal: 12,
  paddingVertical: 8,
  textAlignVertical: 'top',
  ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
};

type Props = Omit<TextInputProps, 'style' | 'value' | 'onChangeText'> & {
  value: string;
  onChangeText: (markdown: string) => void;
  style?: StyleProp<TextStyle>;
  minHeight?: number;
};

/**
 * Inline WYSIWYG editor.
 * TextInput holds plain text only (no ** markers).
 * RichText overlay draws bold/italic on top — same length, no marker bleed-through.
 */
export function FormattedNoteInput({
  value,
  onChangeText,
  onSelectionChange,
  placeholder,
  style,
  minHeight = 180,
  selection,
  ...rest
}: Props) {
  const theme = useTheme();
  const [height, setHeight] = useState(minHeight);
  const flat = StyleSheet.flatten(style) ?? {};
  const surfaceColor = theme.colors.surface;
  const textColor = theme.colors.onSurface;
  const [rich, setRich] = useState<RichContent>(() => markdownToRich(value));
  const lastMarkdown = useRef(value);

  useEffect(() => {
    if (value !== lastMarkdown.current) {
      lastMarkdown.current = value;
      setRich(markdownToRich(value));
    }
  }, [value]);

  const onPlainChange = (plain: string) => {
    const next = updatePlainText(rich, plain);
    const md = richToMarkdown(next);
    lastMarkdown.current = md;
    setRich(next);
    onChangeText(md);
  };

  return (
    <View style={{ minHeight: height, position: 'relative' }}>
      <TextInput
        {...rest}
        value={rich.plain}
        onChangeText={onPlainChange}
        onSelectionChange={onSelectionChange}
        onContentSizeChange={e => {
          setHeight(Math.max(minHeight, e.nativeEvent.contentSize.height));
          rest.onContentSizeChange?.(e);
        }}
        selection={selection}
        multiline
        scrollEnabled={false}
        autoCorrect={false}
        spellCheck={false}
        autoCapitalize="sentences"
        disableFullscreenUI
        placeholder=""
        selectionColor={theme.colors.primary + '66'}
        cursorColor={theme.colors.primary}
        underlineColorAndroid="transparent"
        style={[
          INPUT_METRICS,
          flat,
          {
            minHeight: height,
            color: surfaceColor,
            backgroundColor: 'transparent',
          },
        ]}
      />

      <View
        pointerEvents="none"
        style={[
          INPUT_METRICS,
          flat,
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            minHeight: height,
          },
        ]}
      >
        {!rich.plain ? (
          <Text style={{ fontSize: 16, lineHeight: 24, color: theme.colors.onSurfaceDisabled }}>
            {placeholder}
          </Text>
        ) : (
          <RichText content={rich} style={{ fontSize: 16, lineHeight: 24, color: textColor }} />
        )}
      </View>
    </View>
  );
}
