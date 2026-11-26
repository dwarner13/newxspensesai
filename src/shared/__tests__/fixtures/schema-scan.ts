/**
 * Schema-aware column scanner (owner 2026-11-26: "schema-aware integration tests that reject
 * nonexistent database columns"). Reads `.from('<table>')` query chains in source files and checks
 * every column they select, filter, order by, or write against live-schema.json (table/column NAMES
 * only, from the database's REST schema; no data).
 *
 * Deliberately conservative: only literal column names are checked (string selects, filter/order
 * first arguments, top-level keys of object literals passed to insert/upsert/update). Dynamic values
 * are skipped, never guessed.
 */
import fs from 'fs';
import path from 'path';
import LIVE from './live-schema.json';

export const LIVE_SCHEMA: Readonly<Record<string, readonly string[]>> = LIVE as Record<string, string[]>;

export interface ColumnViolation { file: string; table: string; column: string; usage: string }

const FILTERS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in', 'contains', 'containedBy', 'order', 'not', 'match'];

/** Top-level keys of the object literal starting at `start` (index of '{'). */
function topLevelKeys(src: string, start: number): string[] {
  const keys: string[] = [];
  let depth = 0; let i = start; let token = ''; let inStr: string | null = null;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (inStr) { if (ch === inStr && src[i - 1] !== '\\') inStr = null; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === '{' || ch === '[' || ch === '(') { depth++; token = ''; continue; }
    if (ch === '}' || ch === ']' || ch === ')') { depth--; if (depth === 0) break; token = ''; continue; }
    if (depth === 1) {
      if (ch === ',' || ch === '\n') { token = ''; continue; }
      if (ch === ':') { const k = token.trim().replace(/^['"]|['"]$/g, ''); if (/^[a-z_][a-z0-9_]*$/i.test(k)) keys.push(k); token = ''; continue; }
      token += ch;
    }
  }
  return keys;
}

/** Plain column names from a select string ('*', aggregates, embeds and casts are skipped). */
function selectColumns(sel: string): string[] {
  const cols: string[] = [];
  let depth = 0; let cur = '';
  for (const ch of sel) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { cols.push(cur); cur = ''; continue; }
    cur += ch;
  }
  cols.push(cur);
  return cols.map(c => c.trim())
    .filter(c => c && !c.includes('(') && !c.includes('*'))
    .map(c => c.split('::')[0].split(':').pop()!.trim())   // alias:col → col
    .filter(c => /^[a-z_][a-z0-9_]*$/i.test(c));
}

export function scanSource(file: string, src: string): ColumnViolation[] {
  const out: ColumnViolation[] = [];
  const fromRx = /\.from\(\s*['"]([a-z_][a-z0-9_]*)['"]\s*\)/gi;
  for (const m of src.matchAll(fromRx)) {
    const table = m[1];
    const cols = LIVE_SCHEMA[table];
    if (!cols) continue; // not a REST table (storage bucket, RPC, unknown) — out of scope
    const startIdx = (m.index ?? 0) + m[0].length;
    // the chain: until the first ';' at depth 0 (bounded)
    let end = startIdx; let depth = 0;
    for (; end < src.length && end < startIdx + 4000; end++) {
      const ch = src[end];
      if (ch === '(' || ch === '{' || ch === '[') depth++;
      else if (ch === ')' || ch === '}' || ch === ']') { if (depth === 0) break; depth--; }
      else if ((ch === ';' || ch === ',') && depth === 0) break; // statement end, or next array/arg element
    }
    const chain = src.slice(startIdx, end);
    const has = (c: string) => cols.includes(c);
    const report = (column: string, usage: string) => { if (!has(column)) out.push({ file, table, column, usage }); };

    for (const s of chain.matchAll(/\.select\(\s*(['"`])([^'"`]*)\1/g)) {
      if (s[1] === '`' && s[2].includes('${')) continue;
      for (const c of selectColumns(s[2])) report(c, 'select');
    }
    for (const f of chain.matchAll(new RegExp(`\\.(${FILTERS.join('|')})\\(\\s*['"]([a-z_][a-z0-9_]*)['"]`, 'g'))) {
      report(f[2], f[1]);
    }
    for (const w of chain.matchAll(/\.(insert|upsert|update)\(\s*\{/g)) {
      const brace = startIdx + (w.index ?? 0) + w[0].length - 1;
      for (const k of topLevelKeys(src, brace)) report(k, w[1]);
    }
  }
  return out;
}

export function scanTree(root: string, dirs: string[]): ColumnViolation[] {
  const out: ColumnViolation[] = [];
  const skip = new Set(['node_modules', '__tests__', '_legacy', 'functions_old', 'dist', 'archive', 'archive-2025']);
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (!skip.has(e.name)) walk(p); continue; }
      if (!/\.(ts|tsx)$/.test(e.name) || /\.test\./.test(e.name)) continue;
      out.push(...scanSource(path.relative(root, p).replace(/\\/g, '/'), fs.readFileSync(p, 'utf8')));
    }
  };
  for (const d of dirs) walk(path.join(root, d));
  return out;
}
