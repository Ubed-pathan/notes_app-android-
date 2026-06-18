/** Wrap selected text with markdown markers (toggles off if already wrapped) */
export function wrapSelection(text: string, selection: { start: number; end: number }, marker: string): {
  text: string;
  selection: { start: number; end: number };
} {
  const before = text.slice(0, selection.start);
  const selected = text.slice(selection.start, selection.end);
  const after = text.slice(selection.end);

  if (
    selected.length >= marker.length * 2 &&
    selected.startsWith(marker) &&
    selected.endsWith(marker)
  ) {
    const inner = selected.slice(marker.length, selected.length - marker.length);
    const newText = before + inner + after;
    return {
      text: newText,
      selection: { start: selection.start, end: selection.start + inner.length },
    };
  }

  if (selected.length > 0) {
    const wrapped = `${marker}${selected}${marker}`;
    const newText = before + wrapped + after;
    return {
      text: newText,
      selection: { start: selection.start + marker.length, end: selection.end + marker.length },
    };
  }

  const wrapped = `${marker}${marker}`;
  const newText = before + wrapped + after;
  const cursor = selection.start + marker.length;
  return { text: newText, selection: { start: cursor, end: cursor } };
}

export function insertAtCursor(
  text: string,
  selection: { start: number; end: number },
  insert: string
): { text: string; selection: { start: number; end: number } } {
  const before = text.slice(0, selection.start);
  const after = text.slice(selection.end);
  const newText = before + insert + after;
  const pos = selection.start + insert.length;
  return { text: newText, selection: { start: pos, end: pos } };
}

function getLineInfo(plain: string, cursor: number) {
  const lineStart = cursor === 0 ? 0 : plain.lastIndexOf('\n', cursor - 1) + 1;
  const nextBreak = plain.indexOf('\n', cursor);
  const lineEnd = nextBreak === -1 ? plain.length : nextBreak;
  return {
    lineStart,
    lineEnd,
    lineText: plain.slice(lineStart, lineEnd),
    atLineStart: cursor === lineStart,
    atLineEnd: cursor === lineEnd,
  };
}

function parseNumberedLine(lineText: string): { num: number; content: string } | null {
  const match = lineText.match(/^(\d+)\.\s(.*)$/);
  if (!match) return null;
  return { num: parseInt(match[1], 10), content: match[2] };
}

/** Renumber consecutive list lines and strip duplicated prefixes (e.g. "1. 1. item" → "1. item") */
export { normalizeNumberedLists } from './listNormalize';

function nextListNumber(plain: string, cursor: number): number {
  const { lineStart, lineText } = getLineInfo(plain, cursor);

  const current = parseNumberedLine(lineText);
  if (current) return current.num + 1;

  if (lineStart > 0) {
    const prevLineEnd = lineStart - 1;
    const prevLineStart = plain.lastIndexOf('\n', prevLineEnd - 1) + 1;
    const prev = parseNumberedLine(plain.slice(prevLineStart, prevLineEnd));
    if (prev) return prev.num + 1;
  }

  const before = plain.slice(0, lineStart);
  const count = (before.match(/^\d+\.\s/gm) ?? []).length;
  return count + 1;
}

/** Insert bullet (-) or numbered (1.) list prefix at cursor — never replaces typed text */
export function buildListPrefix(plain: string, cursor: number, type: 'bullet' | 'number'): string {
  const { lineText, atLineStart, atLineEnd } = getLineInfo(plain, cursor);

  if (type === 'bullet') {
    if (/^-\s/.test(lineText)) {
      if (atLineStart) return '';
      const content = lineText.slice(2);
      if (atLineEnd && content.length === 0) return '';
      return '\n- ';
    }
    return atLineStart ? '- ' : '\n- ';
  }

  const numbered = parseNumberedLine(lineText);
  if (numbered) {
    if (atLineStart) return '';
    if (atLineEnd && numbered.content.length === 0) return '';
    return `\n${numbered.num + 1}. `;
  }

  const num = nextListNumber(plain, cursor);
  return atLineStart ? `${num}. ` : `\n${num}. `;
}

/** Resolve where to insert a list prefix (handles stale cursor at line start after toolbar tap) */
export function resolveListInsert(
  plain: string,
  cursor: number,
  type: 'bullet' | 'number'
): { prefix: string; at: number } {
  let at = cursor;
  const info = getLineInfo(plain, cursor);

  if (type === 'number') {
    const numbered = parseNumberedLine(info.lineText);
    if (numbered && info.atLineStart && numbered.content.length > 0) {
      at = info.lineEnd;
    }
  } else if (/^-\s/.test(info.lineText) && info.atLineStart && info.lineText.length > 2) {
    at = info.lineEnd;
  }

  return { prefix: buildListPrefix(plain, at, type), at };
}

/** Strip markdown for preview snippets */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^#+\s/gm, '')
    .replace(/^[-*]\s/gm, '• ')
    .trim();
}

export function formatDueDate(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(ts);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  if (diff === 0) return `Today · ${dateStr}`;
  if (diff === 1) return `Tomorrow · ${dateStr}`;
  if (diff === -1) return `Yesterday · ${dateStr}`;
  if (diff > 0 && diff <= 7) return `In ${diff} days · ${dateStr}`;
  if (diff < 0) return `Overdue · ${dateStr}`;
  return dateStr;
}

export function formatReminder(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
