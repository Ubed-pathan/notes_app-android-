function stripDuplicateListPrefixes(line: string): string {
  let content = line;
  while (/^\d+\.\s/.test(content)) {
    content = content.replace(/^\d+\.\s/, '');
  }
  return content;
}

/** Renumber consecutive list lines and strip duplicated prefixes (e.g. "1. 1. item" → "1. item") */
export function normalizeNumberedLists(text: string): string {
  if (!text) return text;

  const lines = text.split('\n');
  let counter = 0;

  return lines
    .map(line => {
      if (!/^\d+\.\s/.test(line)) {
        counter = 0;
        return line;
      }

      counter += 1;
      const content = stripDuplicateListPrefixes(line);
      return `${counter}. ${content}`;
    })
    .join('\n');
}
