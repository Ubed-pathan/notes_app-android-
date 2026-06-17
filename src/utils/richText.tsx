import { ReactNode } from 'react';
import { StyleSheet, Text, TextStyle, StyleProp } from 'react-native';

export type StyleFlags = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
};

export type RichSpan = { start: number; end: number } & StyleFlags;

export type RichContent = {
  plain: string;
  spans: RichSpan[];
};

const MARKERS: { open: string; flag: keyof StyleFlags }[] = [
  { open: '**', flag: 'bold' },
  { open: '__', flag: 'underline' },
  { open: '~~', flag: 'strike' },
  { open: '*', flag: 'italic' },
];

function emptyFlags(): StyleFlags {
  return {};
}

function flagsEqual(a: StyleFlags, b: StyleFlags): boolean {
  return !!a.bold === !!b.bold && !!a.italic === !!b.italic && !!a.underline === !!b.underline && !!a.strike === !!b.strike;
}

function mergeFlags(a: StyleFlags, b: StyleFlags): StyleFlags {
  return {
    bold: a.bold || b.bold,
    italic: a.italic || b.italic,
    underline: a.underline || b.underline,
    strike: a.strike || b.strike,
  };
}

function flagsAt(spans: RichSpan[], index: number): StyleFlags {
  const flags = emptyFlags();
  for (const s of spans) {
    if (index >= s.start && index < s.end) {
      flags.bold = flags.bold || s.bold;
      flags.italic = flags.italic || s.italic;
      flags.underline = flags.underline || s.underline;
      flags.strike = flags.strike || s.strike;
    }
  }
  return flags;
}

function parseLine(line: string, offset: number): { plain: string; spans: RichSpan[] } {
  const spans: RichSpan[] = [];
  let plain = '';
  const active = emptyFlags();

  const pushSpan = (from: number, to: number) => {
    if (to <= from) return;
    if (!active.bold && !active.italic && !active.underline && !active.strike) return;
    spans.push({
      start: offset + from,
      end: offset + to,
      bold: active.bold,
      italic: active.italic,
      underline: active.underline,
      strike: active.strike,
    });
  };

  let styledFrom = 0;
  let i = 0;

  while (i < line.length) {
    let hit: (typeof MARKERS)[number] | null = null;
    for (const m of MARKERS) {
      if (line.slice(i, i + m.open.length) === m.open) {
        hit = m;
        break;
      }
    }

    if (!hit) {
      plain += line[i];
      i += 1;
      continue;
    }

    pushSpan(styledFrom, plain.length);
    active[hit.flag] = !active[hit.flag];
    styledFrom = plain.length;
    i += hit.open.length;
  }

  pushSpan(styledFrom, plain.length);
  return { plain, spans };
}

/** Markdown string → plain text + style spans (markers hidden) */
export function markdownToRich(markdown: string): RichContent {
  if (!markdown) return { plain: '', spans: [] };

  const lines = markdown.split('\n');
  let plain = '';
  const spans: RichSpan[] = [];

  lines.forEach((line, idx) => {
    const parsed = parseLine(line, plain.length);
    plain += parsed.plain;
    spans.push(...parsed.spans);
    if (idx < lines.length - 1) plain += '\n';
  });

  return { plain, spans: mergeAdjacentSpans(spans) };
}

function mergeAdjacentSpans(spans: RichSpan[]): RichSpan[] {
  if (!spans.length) return [];
  const out: RichSpan[] = [];
  for (const s of spans) {
    const last = out[out.length - 1];
    if (
      last &&
      last.end === s.start &&
      flagsEqual(last, s)
    ) {
      last.end = s.end;
    } else {
      out.push({ ...s });
    }
  }
  return out;
}

function wrapChunk(text: string, flags: StyleFlags): string {
  let out = text;
  if (flags.strike) out = `~~${out}~~`;
  if (flags.underline) out = `__${out}__`;
  if (flags.italic) out = `*${out}*`;
  if (flags.bold) out = `**${out}**`;
  return out;
}

/** Plain text + spans → markdown for storage */
export function richToMarkdown({ plain, spans }: RichContent): string {
  if (!plain) return '';

  const lines = plain.split('\n');
  let offset = 0;
  const parts: string[] = [];

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const lineEnd = offset + line.length;
    let chunk = '';
    let i = offset;

    while (i < lineEnd) {
      const flags = flagsAt(spans, i);
      let j = i + 1;
      while (j < lineEnd && flagsEqual(flagsAt(spans, j), flags)) j += 1;
      chunk += wrapChunk(plain.slice(i, j), flags);
      i = j;
    }

    parts.push(chunk);
    offset = lineEnd + 1;
  }

  return parts.join('\n');
}

/** Keep spans in sync when the user types plain text */
export function updatePlainText(rich: RichContent, newPlain: string): RichContent {
  const oldPlain = rich.plain;
  if (oldPlain === newPlain) return rich;

  let prefix = 0;
  while (
    prefix < oldPlain.length &&
    prefix < newPlain.length &&
    oldPlain[prefix] === newPlain[prefix]
  ) {
    prefix += 1;
  }

  let oldSuffix = oldPlain.length;
  let newSuffix = newPlain.length;
  while (
    oldSuffix > prefix &&
    newSuffix > prefix &&
    oldPlain[oldSuffix - 1] === newPlain[newSuffix - 1]
  ) {
    oldSuffix -= 1;
    newSuffix -= 1;
  }

  const delta = newSuffix - prefix - (oldSuffix - prefix);
  const spans: RichSpan[] = [];

  for (const s of rich.spans) {
    if (s.end <= prefix) {
      spans.push({ ...s });
      continue;
    }
    if (s.start >= oldSuffix) {
      spans.push({ start: s.start + delta, end: s.end + delta, ...pickFlags(s) });
      continue;
    }
    const start = Math.min(s.start, prefix);
    const end = Math.max(s.end, oldSuffix) + delta;
    if (end > start) {
      spans.push({ start, end, ...pickFlags(s) });
    }
  }

  return { plain: newPlain, spans: mergeAdjacentSpans(spans) };
}

function pickFlags(s: RichSpan): StyleFlags {
  return { bold: s.bold, italic: s.italic, underline: s.underline, strike: s.strike };
}

function selectionHasFlag(rich: RichContent, start: number, end: number, flag: keyof StyleFlags): boolean {
  for (let i = start; i < end; i++) {
    if (!flagsAt(rich.spans, i)[flag]) return false;
  }
  return true;
}

export function toggleFormat(
  rich: RichContent,
  selection: { start: number; end: number },
  flag: keyof StyleFlags
): RichContent {
  const { start, end } = selection;
  if (start === end) return rich;

  let spans: RichSpan[];

  if (selectionHasFlag(rich, start, end, flag)) {
    spans = rich.spans.flatMap(s => {
      if (!s[flag]) return [s];
      if (s.end <= start || s.start >= end) return [s];
      const parts: RichSpan[] = [];
      if (s.start < start) parts.push({ ...s, end: start });
      if (s.end > end) parts.push({ ...s, start: end });
      return parts;
    });
  } else {
    spans = [...rich.spans, { start, end, [flag]: true } as RichSpan];
  }

  return { plain: rich.plain, spans: mergeAdjacentSpans(spans) };
}

export function markerToFlag(marker: string): keyof StyleFlags {
  if (marker === '**') return 'bold';
  if (marker === '*') return 'italic';
  if (marker === '__') return 'underline';
  if (marker === '~~') return 'strike';
  return 'bold';
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

function renderLine(plain: string, spans: RichSpan[], baseStyle: TextStyle, lineStart: number, lineEnd: number): ReactNode[] {
  const points = new Set<number>([lineStart, lineEnd]);
  for (const s of spans) {
    if (s.end <= lineStart || s.start >= lineEnd) continue;
    points.add(Math.max(s.start, lineStart));
    points.add(Math.min(s.end, lineEnd));
  }

  const sorted = [...points].sort((a, b) => a - b);
  const nodes: ReactNode[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (b <= a) continue;
    const mid = a + Math.floor((b - a) / 2);
    const flags = flagsAt(spans, mid);
    const text = plain.slice(a, b);
    const hasStyle = flags.bold || flags.italic || flags.underline || flags.strike;
    nodes.push(
      hasStyle ? (
        <Text key={`${a}-${b}`} style={segmentToStyle(flags, baseStyle)}>
          {text}
        </Text>
      ) : (
        text
      )
    );
  }

  return nodes;
}

type RichTextProps = {
  content: RichContent;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

/** Render plain text with style spans — same length as TextInput, no markers */
export function RichText({ content, style, numberOfLines }: RichTextProps) {
  const flat = StyleSheet.flatten(style) ?? {};
  const baseStyle: TextStyle = { fontSize: 16, lineHeight: 24, ...flat };
  const { plain, spans } = content;

  if (!plain) return null;
  if (!spans.length) {
    return (
      <Text style={baseStyle} numberOfLines={numberOfLines}>
        {plain}
      </Text>
    );
  }

  const lines = plain.split('\n');
  let offset = 0;
  const nodes: ReactNode[] = [];

  lines.forEach((line, idx) => {
    const lineStart = offset;
    const lineEnd = offset + line.length;
    nodes.push(...renderLine(plain, spans, baseStyle, lineStart, lineEnd));
    if (idx < lines.length - 1) nodes.push('\n');
    offset = lineEnd + 1;
  });

  return (
    <Text style={baseStyle} numberOfLines={numberOfLines}>
      {nodes}
    </Text>
  );
}
