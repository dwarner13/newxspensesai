/**
 * Prime reply formatting (owner GO): tables, numbered lists, headings, dividers and spacing
 * in the existing FormattedMessageText. Text nodes only; existing cards untouched.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseMessageBlocks, splitTableCells, isTableSeparator, isNumericCell } from '../messageBlocks';
import { safePartialMarkdown } from '../../components/chat/typingReveal';

const root = path.resolve(__dirname, '../../..');
const tm = fs.readFileSync(path.join(root, 'src/components/chat/TypingMessage.tsx'), 'utf8');

describe('parseMessageBlocks', () => {
  it('headings 1–4, dividers, bullets, numbered steps, paragraphs', () => {
    const b = parseMessageBlocks('# Title\n## Summary\n#### Note\n---\n- one\n1. first\n2) second\nPlain text\n\nMore');
    expect(b.map((x) => x.type)).toEqual(['heading', 'heading', 'heading', 'divider', 'bullet', 'numbered', 'numbered', 'paragraph', 'blank', 'paragraph']);
    expect(b[0]).toEqual({ type: 'heading', level: 1, text: 'Title' });
    expect(b[2]).toEqual({ type: 'heading', level: 4, text: 'Note' });
    expect(b[6]).toEqual({ type: 'numbered', marker: '2.', text: 'second' });
  });

  it('pipe table: header, skipped separator, rows', () => {
    const b = parseMessageBlocks('Here:\n| Category | Spent |\n|---|---:|\n| Groceries | $412.50 |\n| Dining | $180.00 |\nDone');
    expect(b[1]).toEqual({ type: 'table', header: ['Category', 'Spent'], rows: [['Groceries', '$412.50'], ['Dining', '$180.00']] });
    expect(b[2]).toEqual({ type: 'paragraph', text: 'Done' });
  });

  it('table without a separator: all rows are data', () => {
    expect(parseMessageBlocks('| a | b |\n| c | d |')[0]).toEqual({ type: 'table', header: null, rows: [['a', 'b'], ['c', 'd']] });
  });

  it('partially typed replies never flash raw markers', () => {
    // heading still being typed
    expect(parseMessageBlocks('##')).toEqual([]);
    // separator still being typed
    expect(parseMessageBlocks('| Category | Spent |\n|--')).toEqual([{ type: 'table', header: ['Category', 'Spent'], rows: [] }]);
    // row without its closing pipe
    expect(parseMessageBlocks('| A | B |\n|---|---|\n| Groc')[0]).toEqual({ type: 'table', header: ['A', 'B'], rows: [['Groc']] });
    // "---" is a divider, not a bullet; "-- text" is not a divider
    expect(parseMessageBlocks('---')[0].type).toBe('divider');
    expect(parseMessageBlocks('- item')[0].type).toBe('bullet');
  });

  it('helpers', () => {
    expect(splitTableCells('| a | **b** |')).toEqual(['a', '**b**']);
    expect(isTableSeparator('| :--- | ---: |')).toBe(true);
    expect(isTableSeparator('| a | b |')).toBe(false);
    for (const n of ['$1,234.56', '−$45.00', '12%', '**$90**', '42', 'C$10']) expect(isNumericCell(n)).toBe(true);
    for (const n of ['Groceries', 'May 2026', '']) expect(isNumericCell(n)).toBe(false);
  });

  it('safePartialMarkdown still works with tables', () => {
    expect(safePartialMarkdown('| **Groc')).toBe('| Groc');
  });
});

describe('FormattedMessageText', () => {
  it('renders the parsed blocks with semantic, accessible markup', () => {
    expect(tm).toMatch(/const blocks = parseMessageBlocks\(text\);/);
    expect(tm).toMatch(/<th key=\{c\} scope="col"/);
    expect(tm).toMatch(/overflow-x-auto[^"]*" role="region" aria-label="Table" tabIndex=\{0\}/);
    expect(tm).toMatch(/<hr key=/);
    expect(tm).toMatch(/const Tag = \(\['h3', 'h4', 'h5', 'h6'\] as const\)\[b\.level - 1\];/);
  });

  it('table cells, headings and list items use the same inline renderer (bold, app-route links)', () => {
    expect(tm).toMatch(/renderInlineRich\(r\[c\] \?\? '', `t-\$\{idx\}-\$\{ri\}-\$\{c\}`\)/);
    expect(tm).toMatch(/renderInlineRich\(b\.text, `ol-\$\{idx\}`\)/);
  });

  it('no HTML injection; links still restricted to app routes', () => {
    expect(tm).not.toMatch(/dangerouslySetInnerHTML/);
    expect(tm).toMatch(/\/\\\[\(\[\^\\\]\]\+\)\\\]\\\(\(\\\/dashboard\\\/transactions/);
  });
});
