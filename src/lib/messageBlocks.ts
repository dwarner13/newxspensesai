/**
 * Prime reply formatting (owner GO): block structure for FormattedMessageText.
 *
 * Pure and text-only: it splits a reply into headings, dividers, bullet and numbered items,
 * pipe tables and paragraphs. FormattedMessageText renders each block with React text nodes
 * (no HTML injection); inline bold, amounts and app-route links stay in renderInlineRich.
 *
 * Tolerant of partially typed replies, so a table or heading forms in place instead of
 * flashing raw "|" / "#" text and then jumping:
 *  - a lone "#", "##"… line (heading still being typed) renders nothing yet;
 *  - a separator row ("|---|---|", or any partial of it) is never shown;
 *  - a table row without its closing "|" still renders as a row.
 */

export type MessageBlock =
  | { type: 'blank' }
  | { type: 'heading'; level: 1 | 2 | 3 | 4; text: string }
  | { type: 'divider' }
  | { type: 'bullet'; text: string }
  | { type: 'numbered'; marker: string; text: string }
  | { type: 'table'; header: string[] | null; rows: string[][] }
  | { type: 'paragraph'; text: string };

const HEADING = /^(#{1,4})\s+(.*)$/;
const HEADING_IN_PROGRESS = /^#{1,6}$/;
const DIVIDER = /^(?:-{3,}|\*{3,}|_{3,})$/;
const BULLET = /^[-–—*•]\s+/;
const NUMBERED = /^(\d{1,3})[.)]\s+/;
const TABLE_LINE = /^\|/;
/** Only pipes, dashes, colons and spaces, with at least one dash: a (possibly partial) separator row. */
const TABLE_SEPARATOR = /^\|[\s:|-]*-[\s:|-]*$/;

export function splitTableCells(line: string): string[] {
  let t = line.trim();
  if (t.startsWith('|')) t = t.slice(1);
  if (t.endsWith('|')) t = t.slice(0, -1);
  return t.split('|').map((c) => c.trim());
}

export function isTableSeparator(line: string): boolean {
  return TABLE_SEPARATOR.test(line.trim());
}

/** True for a cell that is a number / amount / percentage (right-aligned in tables). */
export function isNumericCell(cell: string): boolean {
  return /^[-+−]?\s?(?:C\$|CA\$|US\$|\$|€|£)?\s?[-+−]?\d[\d,]*(?:\.\d+)?\s?%?$/.test(cell.replace(/\*\*/g, '').trim());
}

export function parseMessageBlocks(text: string): MessageBlock[] {
  const lines = String(text || '').split('\n');
  const blocks: MessageBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const t = raw.trim();

    if (TABLE_LINE.test(t)) {
      const group: string[] = [];
      while (i < lines.length && TABLE_LINE.test(lines[i].trim())) group.push(lines[i++].trim());
      const sepIdx = group.findIndex(isTableSeparator);
      const dataLines = group.filter((l) => !isTableSeparator(l));
      // Header = the row before the separator (standard markdown); without one, all rows are data.
      const hasHeader = sepIdx === 1;
      const header = hasHeader ? splitTableCells(group[0]) : null;
      const rows = (hasHeader ? dataLines.slice(1) : dataLines).map(splitTableCells);
      if (header || rows.length > 0) blocks.push({ type: 'table', header, rows });
      continue;
    }

    i++;
    if (!t) { blocks.push({ type: 'blank' }); continue; }
    if (HEADING_IN_PROGRESS.test(t)) continue;
    const h = t.match(HEADING);
    if (h) { blocks.push({ type: 'heading', level: h[1].length as 1 | 2 | 3 | 4, text: h[2] }); continue; }
    if (DIVIDER.test(t)) { blocks.push({ type: 'divider' }); continue; }
    if (BULLET.test(t)) { blocks.push({ type: 'bullet', text: t.replace(BULLET, '') }); continue; }
    const n = t.match(NUMBERED);
    if (n) { blocks.push({ type: 'numbered', marker: `${n[1]}.`, text: t.replace(NUMBERED, '') }); continue; }
    blocks.push({ type: 'paragraph', text: raw });
  }
  return blocks;
}
