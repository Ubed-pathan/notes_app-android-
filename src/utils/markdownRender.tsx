import { ReactNode } from 'react';
import { StyleSheet, Text, TextStyle, StyleProp } from 'react-native';

type StyleFlags = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
};

type Segment = { text: string; style: StyleFlags };

function mergeStyles(a: StyleFlags, b: StyleFlags): StyleFlags {
  return {
    bold: a.bold || b.bold,
    italic: a.italic || b.italic,
    underline: a.underline || b.underline,
    strike: a.strike || b.strike,
  };
}

function sameStyle(a: StyleFlags, b: StyleFlags): boolean {
  return !!a.bold === !!b.bold && !!a.italic === !!b.italic && !!a.underline === !!b.underline && !!a.strike === !!b.strike;
}

function mergeAdjacent(segments: Segment[]): Segment[] {
  if (segments.length <= 1) return segments;
  const out: Segment[] = [];
  for (const s of segments) {
    const last = out[out.length - 1];
    if (last && sameStyle(last.style, s.style)) {
      last.text += s.text;
    } else {
      out.push({ text: s.text, style: { ...s.style } });
    }
  }
  return out;
}

/** Toggle-parser: strips markers and applies style (handles unclosed markers while typing) */
function applyToggleMarker(segments: Segment[], marker: string, flag: keyof StyleFlags): Segment[] {
  const result: Segment[] = [];

  for (const seg of segments) {
    if (seg.text.length === 0) continue;

    let active = false;
    let buffer = '';
    let i = 0;
    const flush = () => {
      if (!buffer) return;
      result.push({ text: buffer, style: mergeStyles(seg.style, { [flag]: active }) });
      buffer = '';
    };

    while (i < seg.text.length) {
      if (seg.text.slice(i, i + marker.length) === marker) {
        flush();
        active = !active;
        i += marker.length;
      } else {
        buffer += seg.text[i];
        i += 1;
      }
    }
    flush();
  }

  return result.length ? result : [{ text: '', style: {} }];
}

function parseInline(text: string): Segment[] {
  let segments: Segment[] = [{ text, style: {} }];
  segments = applyToggleMarker(segments, '**', 'bold');
  segments = applyToggleMarker(segments, '__', 'underline');
  segments = applyToggleMarker(segments, '~~', 'strike');
  segments = applyToggleMarker(segments, '*', 'italic');
  return mergeAdjacent(segments.filter(s => s.text.length > 0));
}

function segmentToStyle(flags: StyleFlags, base: TextStyle): TextStyle {
  const decorations: string[] = [];
  if (flags.underline) decorations.push('underline');
  if (flags.strike) decorations.push('line-through');

  return {
    color: base.color,
    fontSize: base.fontSize,
    lineHeight: base.lineHeight,
    fontWeight: flags.bold ? '700' : '400',
    fontStyle: flags.italic ? 'italic' : 'normal',
    textDecorationLine:
      decorations.length > 0 ? (decorations.join(' ') as TextStyle['textDecorationLine']) : 'none',
    opacity: base.opacity,
  };
}

function renderSegments(text: string, baseStyle: TextStyle): ReactNode[] {
  const display = text.startsWith('- ') ? `• ${text.slice(2)}` : text;
  const segments = parseInline(display);
  if (segments.length === 1 && !segments[0].style.bold && !segments[0].style.italic && !segments[0].style.underline && !segments[0].style.strike) {
    return [segments[0].text];
  }
  return segments.map((seg, i) => (
    <Text key={i} style={segmentToStyle(seg.style, baseStyle)}>
      {seg.text}
    </Text>
  ));
}

type MarkdownTextProps = {
  children: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

/** Renders inline markdown (**bold**, *italic*, __underline__, ~~strike~~) as styled Text */
export function MarkdownText({ children, style, numberOfLines }: MarkdownTextProps) {
  const flat = StyleSheet.flatten(style) ?? {};
  const baseStyle: TextStyle = {
    fontSize: 16,
    lineHeight: 24,
    ...flat,
  };

  const lines = children.split('\n');

  return (
    <Text style={baseStyle} numberOfLines={numberOfLines}>
      {lines.flatMap((line, i) => {
        const nodes = renderSegments(line, baseStyle);
        return i < lines.length - 1 ? [...nodes, '\n'] : nodes;
      })}
    </Text>
  );
}
