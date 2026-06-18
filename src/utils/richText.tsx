import { ReactNode, memo } from 'react';
import { StyleSheet, Text, TextStyle, StyleProp } from 'react-native';
import { normalizeNumberedLists } from './listNormalize';

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
  { open: '_', flag: 'italic' },
];

function emptyFlags(): StyleFlags {
  return {};
}

function flagsEqual(a: StyleFlags, b: StyleFlags): boolean {
  return !!a.bold === !!b.bold && !!a.italic === !!b.italic && !!a.underline === !!b.underline && !!a.strike === !!b.strike;
}

function pickFlags(s: RichSpan): StyleFlags {
  return { bold: s.bold, italic: s.italic, underline: s.underline, strike: s.strike };
}

export function flagsAt(spans: RichSpan[], index: number): StyleFlags {
  const flags = emptyFlags();
  for (const s of spans) {
    if (index >= s.start && index < s.end) {
      flags.bold = flags.bold || !!s.bold;
      flags.italic = flags.italic || !!s.italic;
      flags.underline = flags.underline || !!s.underline;
      flags.strike = flags.strike || !!s.strike;
    }
  }
  return flags;
}

/** Split overlapping spans into clean non-overlapping segments */
export function normalizeSpans(plain: string, spans: RichSpan[]): RichSpan[] {
  if (!plain.length || !spans.length) return [];

  const points = new Set<number>([0, plain.length]);
  for (const s of spans) {
    if (s.start < s.end) {
      points.add(Math.max(0, s.start));
      points.add(Math.min(plain.length, s.end));
    }
  }

  const sorted = [...points].sort((a, b) => a - b);
  const out: RichSpan[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];
    if (end <= start) continue;
    const mid = start + Math.floor((end - start) / 2);
    const flags = flagsAt(spans, mid);
    if (flags.bold || flags.italic || flags.underline || flags.strike) {
      out.push({ start, end, ...flags });
    }
  }

  return mergeAdjacentSpans(out);
}

function mergeAdjacentSpans(spans: RichSpan[]): RichSpan[] {
  if (!spans.length) return [];
  const out: RichSpan[] = [];
  for (const s of spans) {
    const last = out[out.length - 1];
    if (last && last.end === s.start && flagsEqual(last, s)) {
      last.end = s.end;
    } else {
      out.push({ ...s });
    }
  }
  return out;
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
      bold: !!active.bold,
      italic: !!active.italic,
      underline: !!active.underline,
      strike: !!active.strike,
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

    // Legacy notes saved with *italic*
    if (!hit && line[i] === '*' && line.slice(i, i + 2) !== '**') {
      hit = { open: '*', flag: 'italic' };
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

/** Markdown string → plain text + style spans */
export function markdownToRich(markdown: string): RichContent {
  if (!markdown) return { plain: '', spans: [] };

  const lines = normalizeNumberedLists(markdown).split('\n');
  let plain = '';
  const spans: RichSpan[] = [];

  lines.forEach((line, idx) => {
    const parsed = parseLine(line, plain.length);
    plain += parsed.plain;
    spans.push(...parsed.spans);
    if (idx < lines.length - 1) plain += '\n';
  });

  return { plain, spans: normalizeSpans(plain, spans) };
}

function wrapChunk(text: string, flags: StyleFlags): string {
  let out = text;
  if (flags.strike) out = `~~${out}~~`;
  if (flags.underline) out = `__${out}__`;
  if (flags.italic) out = `_${out}_`;
  if (flags.bold) out = `**${out}**`;
  return out;
}

/** Plain text + spans → markdown for storage */
export function richToMarkdown({ plain, spans }: RichContent): string {
  if (!plain) return '';

  const normalized = normalizeSpans(plain, spans);
  const lines = plain.split('\n');
  let offset = 0;
  const parts: string[] = [];

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const lineEnd = offset + line.length;
    let chunk = '';
    let i = offset;

    while (i < lineEnd) {
      const flags = flagsAt(normalized, i);
      let j = i + 1;
      while (j < lineEnd && flagsEqual(flagsAt(normalized, j), flags)) j += 1;
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

  // Append at end
  if (newPlain.length === oldPlain.length + 1 && newPlain.startsWith(oldPlain)) {
    return { plain: newPlain, spans: rich.spans };
  }

  // Backspace at end
  if (newPlain.length === oldPlain.length - 1 && oldPlain.startsWith(newPlain)) {
    const spans = rich.spans
      .map(s => (s.end > newPlain.length ? { ...s, end: newPlain.length } : s))
      .filter(s => s.end > s.start);
    return { plain: newPlain, spans: normalizeSpans(newPlain, spans) };
  }

  let prefix = 0;
  while (
    prefix < oldPlain.length &&
    prefix < newPlain.length &&
    oldPlain[prefix] === newPlain[prefix]
  ) {
    prefix += 1;
  }

  let oldEnd = oldPlain.length;
  let newEnd = newPlain.length;
  while (
    oldEnd > prefix &&
    newEnd > prefix &&
    oldPlain[oldEnd - 1] === newPlain[newEnd - 1]
  ) {
    oldEnd -= 1;
    newEnd -= 1;
  }

  const delta = newEnd - prefix - (oldEnd - prefix);
  const adjusted: RichSpan[] = [];

  for (const s of rich.spans) {
    const flags = pickFlags(s);

    if (s.end <= prefix) {
      // Wholly before edit
      adjusted.push({ ...s });
    } else if (s.start >= oldEnd) {
      // Wholly after edit
      adjusted.push({ start: s.start + delta, end: s.end + delta, ...flags });
    } else if (s.start <= prefix && s.end >= oldEnd) {
      // Edit inside formatted run — keep bold/italic/etc. on the whole word
      adjusted.push({ start: s.start, end: s.end + delta, ...flags });
    } else if (s.start < prefix && s.end > prefix) {
      // Starts before edit, overlaps edit
      const end = s.end > oldEnd ? s.end + delta : newEnd;
      adjusted.push({ start: s.start, end, ...flags });
    } else if (s.start >= prefix && s.start < oldEnd && s.end > oldEnd) {
      // Starts in edit, ends after
      adjusted.push({ start: prefix, end: s.end + delta, ...flags });
    } else if (s.start >= prefix && s.end <= oldEnd) {
      // Wholly inside replaced text — keep formatting on the new text
      adjusted.push({ start: prefix, end: newEnd, ...flags });
    }
  }

  return { plain: newPlain, spans: normalizeSpans(newPlain, adjusted) };
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

  const normalized = normalizeSpans(rich.plain, rich.spans);

  if (selectionHasFlag({ plain: rich.plain, spans: normalized }, start, end, flag)) {
    const updated: RichSpan[] = [];
    for (const s of normalized) {
      if (s.end <= start || s.start >= end) {
        updated.push({ ...s });
        continue;
      }
      if (s.start < start) updated.push({ ...s, end: start });
      if (s.end > end) updated.push({ ...s, start: end });

      const a = Math.max(s.start, start);
      const b = Math.min(s.end, end);
      if (a < b) {
        if (s[flag]) {
          const rest = { ...pickFlags(s), [flag]: false };
          if (rest.bold || rest.italic || rest.underline || rest.strike) {
            updated.push({ start: a, end: b, ...rest });
          }
        } else {
          updated.push({ start: a, end: b, ...pickFlags(s) });
        }
      }
    }
    return { plain: rich.plain, spans: normalizeSpans(rich.plain, updated) };
  }

  const withFlag = [...normalized, { start, end, [flag]: true } as RichSpan];
  return { plain: rich.plain, spans: normalizeSpans(rich.plain, withFlag) };
}

export function markerToFlag(marker: string): keyof StyleFlags {
  if (marker === '**') return 'bold';
  if (marker === '*' || marker === '_') return 'italic';
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

function renderRange(plain: string, spans: RichSpan[], baseStyle: TextStyle, lineStart: number, lineEnd: number): ReactNode[] {
  const normalized = normalizeSpans(plain, spans);
  const points = new Set<number>([lineStart, lineEnd]);
  for (const s of normalized) {
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
    const flags = flagsAt(normalized, mid);
    const text = plain.slice(a, b);
    const styled = flags.bold || flags.italic || flags.underline || flags.strike;
    nodes.push(
      styled ? (
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

/** Render plain text with style spans — used in note list + editor preview */
export const RichText = memo(function RichText({ content, style, numberOfLines }: RichTextProps) {
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
    nodes.push(...renderRange(plain, spans, baseStyle, lineStart, lineEnd));
    if (idx < lines.length - 1) nodes.push('\n');
    offset = lineEnd + 1;
  });

  return (
    <Text style={baseStyle} numberOfLines={numberOfLines}>
      {nodes}
    </Text>
  );
});

/** Parse markdown once for preview components */
export function markdownToRichText(markdown: string, style?: StyleProp<TextStyle>) {
  return <RichText content={markdownToRich(markdown)} style={style} />;
}
