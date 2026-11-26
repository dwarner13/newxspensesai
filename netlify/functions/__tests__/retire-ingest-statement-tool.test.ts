/**
 * AR4-ATT-01 containment (owner authorization 2026-11-25, "STATEMENT TOOL SECURITY").
 * ingest_statement_enhanced read a model-chosen storage path with the service-role client and
 * inserted into the caller's transactions. It must never be offered, picked or executed, whatever
 * employee_profiles.tools_allowed says. Synthetic data only.
 */
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

const serverClient = vi.fn(() => { throw new Error('storage/database must not be touched'); });
vi.mock('../../../src/server/db', () => ({ getSupabaseServerClient: serverClient }));

const RETIRED = 'ingest_statement_enhanced';
const OTHER_USERS_PATH = '00000000-0000-4000-8000-0000000000bb/11111111-0000-4000-8000-000000000001/statement.pdf';

describe('ingest_statement_enhanced is retired', () => {
  it('is never picked for an employee, even when tools_allowed lists it', async () => {
    const { pickTools } = await import('../../../src/agent/tools/index');
    const picked = pickTools([RETIRED, 'vision_ocr_light', 'request_employee_handoff']);
    expect(Object.keys(picked)).not.toContain(RETIRED);
    expect(Object.keys(picked)).toEqual(expect.arrayContaining(['vision_ocr_light', 'request_employee_handoff']));
  });

  it('is never offered to the model as a tool definition', async () => {
    const { toOpenAIToolDefs } = await import('../../../src/agent/tools/index');
    const names = toOpenAIToolDefs([RETIRED, 'vision_ocr_light']).map(d => d.function.name);
    expect(names).not.toContain(RETIRED);
    expect(names).toContain('vision_ocr_light');
  });

  it('the confirmation path cannot resurrect it (it also goes through pickTools)', async () => {
    const { pickTools } = await import('../../../src/agent/tools/index');
    expect(pickTools([RETIRED])).toEqual({});
  });

  it('a direct execute() refuses before any storage or database access (another customer\'s path)', async () => {
    const tool = await import('../../../src/agent/tools/impl/ingest_statement_enhanced');
    const r = await tool.execute({ fileId: OTHER_USERS_PATH, deduplication: true, autoCategorization: true }, { userId: 'u-synthetic-a' });
    expect(r.ok).toBe(false);
    expect(String((r as { error: Error }).error.message)).toMatch(/retired/);
    expect(serverClient).not.toHaveBeenCalled();
  });

  it('chat.ts reaches tools only through pickTools / toOpenAIToolDefs (no direct registry access)', () => {
    const chat = fs.readFileSync(path.join(__dirname, '../chat.ts'), 'utf8');
    expect(chat).not.toMatch(/toolModules\.get\(/);
    expect(chat).not.toMatch(/ingestStatementEnhanced|impl\/ingest_statement_enhanced/);
  });

  it('no Netlify function or Smart Import code depends on the tool (upload pipeline unaffected)', () => {
    const dir = path.join(__dirname, '..');
    const offenders = fs.readdirSync(dir)
      .filter(f => f.endsWith('.ts'))
      .filter(f => /ingest_statement_enhanced|ingestStatementEnhanced/.test(fs.readFileSync(path.join(dir, f), 'utf8')));
    expect(offenders).toEqual([]);
  });
});
