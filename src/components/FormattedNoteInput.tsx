import { memo, useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  StyleProp,
  TextStyle,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import {
  markdownToRich,
  richToMarkdown,
  updatePlainText,
  toggleFormat,
  RichContent,
  RichSpan,
  StyleFlags,
  RichText,
} from '../utils/richText';
import { insertAtCursor, buildListPrefix } from '../utils/formatting';

const INPUT_METRICS: TextStyle = {
  fontSize: 16,
  lineHeight: 24,
  paddingHorizontal: 12,
  paddingVertical: 8,
  textAlignVertical: 'top',
  ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
};

export type FormattedNoteInputHandle = {
  applyFormat: (flag: keyof StyleFlags) => void;
  insertList: (type: 'bullet' | 'number') => void;
  getMarkdown: () => string;
};

type Props = Omit<TextInputProps, 'style' | 'value' | 'onChangeText'> & {
  initialContent: string;
  onMarkdownChange: (markdown: string) => void;
  style?: StyleProp<TextStyle>;
  minHeight?: number;
};

export const FormattedNoteInput = forwardRef<FormattedNoteInputHandle, Props>(function FormattedNoteInput(
  { initialContent, onMarkdownChange, placeholder, style, minHeight = 180, ...rest },
  ref
) {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const [height, setHeight] = useState(minHeight);
  const flat = StyleSheet.flatten(style) ?? {};
  const textColor = theme.colors.onSurface;
  const [plain, setPlain] = useState(() => markdownToRich(initialContent).plain);
  const [spans, setSpans] = useState<RichSpan[]>(() => markdownToRich(initialContent).spans);
  const richRef = useRef<RichContent>(markdownToRich(initialContent));
  const selectionRef = useRef({ start: 0, end: 0 });
  const lastSelectionRef = useRef({ start: 0, end: 0 });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(initialContent);

  const syncFromMarkdown = useCallback((markdown: string) => {
    const next = markdownToRich(markdown);
    richRef.current = next;
    loadedRef.current = markdown;
    setPlain(next.plain);
    setSpans(next.spans);
  }, []);

  useEffect(() => {
    if (initialContent !== loadedRef.current) {
      syncFromMarkdown(initialContent);
    }
  }, [initialContent, syncFromMarkdown]);

  const flushSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const md = richToMarkdown(richRef.current);
    loadedRef.current = md;
    onMarkdownChange(md);
  }, [onMarkdownChange]);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const md = richToMarkdown(richRef.current);
      loadedRef.current = md;
      onMarkdownChange(md);
    }, 400);
  }, [onMarkdownChange]);

  const applyRich = useCallback(
    (next: RichContent, saveNow = false) => {
      richRef.current = next;
      setPlain(next.plain);
      setSpans(next.spans);
      if (saveNow) flushSave();
      else scheduleSave();
    },
    [flushSave, scheduleSave]
  );

  const getActiveSelection = useCallback(() => {
    const cur = selectionRef.current;
    if (cur.start !== cur.end) return cur;
    return lastSelectionRef.current;
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      applyFormat(flag: keyof StyleFlags) {
        const sel = getActiveSelection();
        if (sel.start === sel.end) return;
        const updated = toggleFormat(richRef.current, sel, flag);
        applyRich(updated, true);
        setFocused(false);
      },
      insertList(type: 'bullet' | 'number') {
        const cursor = selectionRef.current.start;
        const prefix = buildListPrefix(richRef.current.plain, cursor, type);
        if (!prefix) return;
        const result = insertAtCursor(richRef.current.plain, { start: cursor, end: cursor }, prefix);
        const updated = updatePlainText(richRef.current, result.text);
        selectionRef.current = result.selection;
        applyRich(updated, true);
        setFocused(true);
        requestAnimationFrame(() => inputRef.current?.focus());
      },
      getMarkdown() {
        return richToMarkdown(richRef.current);
      },
    }),
    [applyRich, getActiveSelection]
  );

  const onPlainChange = useCallback(
    (text: string) => {
      const next = updatePlainText(richRef.current, text);
      richRef.current = next;
      setPlain(text);
      setSpans(next.spans);
      scheduleSave();
    },
    [scheduleSave]
  );

  const onSelectionChange = useCallback((start: number, end: number) => {
    selectionRef.current = { start, end };
    if (start !== end) lastSelectionRef.current = { start, end };
  }, []);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    []
  );

  const inputStyle = [INPUT_METRICS, flat, { minHeight: height, color: textColor }];
  const richContent: RichContent = { plain, spans };

  if (focused) {
    return (
      <TextInput
        {...rest}
        ref={inputRef}
        value={plain}
        onChangeText={onPlainChange}
        onSelectionChange={e => onSelectionChange(e.nativeEvent.selection.start, e.nativeEvent.selection.end)}
        onContentSizeChange={e => {
          setHeight(Math.max(minHeight, e.nativeEvent.contentSize.height));
        }}
        onBlur={() => {
          setFocused(false);
          flushSave();
        }}
        multiline
        autoFocus
        scrollEnabled={false}
        autoCorrect={false}
        spellCheck={false}
        autoCapitalize="sentences"
        disableFullscreenUI
        placeholder={placeholder}
        placeholderTextColor={theme.colors.onSurfaceDisabled}
        selectionColor={theme.colors.primary + '66'}
        cursorColor={theme.colors.primary}
        underlineColorAndroid="transparent"
        style={inputStyle}
      />
    );
  }

  return (
    <Pressable onPress={() => setFocused(true)} style={[INPUT_METRICS, flat, { minHeight: height }]}>
      {!plain ? (
        <Text style={{ fontSize: 16, lineHeight: 24, color: theme.colors.onSurfaceDisabled }}>
          {placeholder}
        </Text>
      ) : (
        <RichText content={richContent} style={{ fontSize: 16, lineHeight: 24, color: textColor }} />
      )}
      <TextInput
        ref={inputRef}
        value={plain}
        onChangeText={onPlainChange}
        onFocus={() => setFocused(true)}
        onSelectionChange={e => onSelectionChange(e.nativeEvent.selection.start, e.nativeEvent.selection.end)}
        multiline
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
      />
    </Pressable>
  );
});
