/**
 * Owner, 2026-11-25 (account deletion and security decisions):
 * - The browser "Nuke All Financial Data" is removed; no browser code bulk-deletes data.
 * - The AI delete_my_data tool's destructive capability is disabled: an AI-generated { confirm:true }
 *   can never stand in for the customer's explicit authorization.
 */
import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

vi.mock('../../server/db', () => ({ deleteUserData: vi.fn(async () => ({ ok: true })) }));

const SRC = path.resolve(__dirname, '../..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');
/** Source without comments (block, JSX and line comments): the checks apply to live code only. */
const code = (rel: string) => read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('delete_my_data tool is disabled (behavioural)', () => {
  it('never deletes, even with confirm:true from the model, and says so honestly', async () => {
    const db = await import('../../server/db');
    const tool = await import('../../agent/tools/impl/delete_my_data');
    const r = await tool.execute({ confirm: true }, { userId: 'u1' });
    expect(r).toMatchObject({ ok: true, value: { ok: false } });
    expect((r as { value: { message: string } }).value.message).toMatch(/Nothing has been deleted/);
    expect((db.deleteUserData as unknown as { mock: { calls: unknown[] } }).mock.calls).toHaveLength(0);
  });
  it('the tool code no longer references deleteUserData; the registry marks it non-mutating', () => {
    expect(code('agent/tools/impl/delete_my_data.ts')).not.toMatch(/deleteUserData/);
    const idx = read('agent/tools/index.ts');
    const block = idx.slice(idx.indexOf("['delete_my_data', {"), idx.indexOf("['export_my_data', {"));
    expect(block).toMatch(/mutates: false/);
    expect(block).toMatch(/requiresConfirm: false/);
  });
});

describe('Settings has no browser-side data destruction', () => {
  const settings = code('pages/SettingsV2/SettingsPageV2.tsx');
  it('the Nuke button and its bulk delete loop are gone', () => {
    expect(settings).not.toMatch(/Nuke All Financial Data/);
    expect(settings).not.toMatch(/\.delete\(\)\.eq\("user_id"/);
    expect(settings).not.toMatch(/sb\.from\(t\)\.delete\(\)/);
  });
  it('an honest support pointer remains', () => {
    expect(settings).toMatch(/please contact support/);
    expect(settings).toMatch(/Nothing is deleted from this page/);
  });
});
