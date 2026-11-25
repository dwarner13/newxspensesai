/**
 * Owner P-8 compatibility guard for the least-privilege migration (browser = read-only on
 * chat_messages / chat_sessions / chat_threads). Browser code must never insert, update, upsert or
 * delete these tables: conversation writes are server-only (service role, shared platform).
 *
 * Known legacy writers are NOT rendered in the live app (verified 2026-11-25) and are allow-listed
 * only so this guard can land before they are removed:
 * - components/chat/UnifiedAssistantChat.tsx (chat_threads insert) — imported, never rendered.
 * - services/smartImportConversation.ts (chat_sessions insert/update) — used only by
 *   _legacy/ByteDocumentChat.tsx, rendered only by a test page whose route is commented out.
 * - agent/tools/impl/merchant_analysis_refine.ts — runs server-side inside the chat function.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '../..');
const ALLOW = new Set([
  'components/chat/UnifiedAssistantChat.tsx',
  'services/smartImportConversation.ts',
  'agent/tools/impl/merchant_analysis_refine.ts',
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['__tests__', '_archive', '_legacy', 'node_modules'].includes(e.name)) continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

describe('browser code never writes conversation tables', () => {
  it('no insert/update/upsert/delete on chat_messages, chat_sessions or chat_threads', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const rel = path.relative(SRC, file).split(path.sep).join('/');
      if (ALLOW.has(rel)) continue;
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((l, i) => {
        if (!/from\(\s*['"](chat_messages|chat_sessions|chat_threads)['"]\s*\)/.test(l)) return;
        const window = lines.slice(i, i + 8).join(' ');
        if (/\.(insert|update|upsert|delete)\(/.test(window)) offenders.push(`${rel}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });
  it('allow-listed legacy writers are still not rendered anywhere live', () => {
    // Remove block comments (incl. JSX {/* ... */}) and line comments before checking.
    const live = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(live('layouts/DashboardLayout.tsx')).not.toMatch(/<UnifiedAssistantChat[\s/>]/);
    expect(live('pages/dashboard/TransactionsPage.tsx')).not.toMatch(/<UnifiedAssistantChat[\s/>]/);
    expect(live('App.tsx')).not.toMatch(/<Route[^>]*PrimeAITestPage/);
    expect(live('pages/dashboard/SmartImportAIPage.tsx')).not.toMatch(/<ByteDocumentChat[\s/>]/);
  });
});
