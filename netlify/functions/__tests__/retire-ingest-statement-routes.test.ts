/**
 * AR4-ATT-01 (owner, "STATEMENT TOOL SECURITY HOTFIX" 2026-11-25): targeted tests that the retired
 * ingest_statement_enhanced tool cannot execute through ANY employee or alternate route.
 * Synthetic data only; storage/database access is a spy that fails the test if touched.
 */
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Requesting a client at module load is allowed; USING storage or the database fails the test.
const touched = (): never => { throw new Error('storage/database must not be touched'); };
const serverClient = vi.fn(() => ({ from: touched, rpc: touched, storage: { from: touched } }));
vi.mock('../../../src/server/db', () => ({ getSupabaseServerClient: serverClient }));

const ROOT = path.join(__dirname, '../../..');
const RETIRED = 'ingest_statement_enhanced';
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// Every employee slug and alias the platform recognises (src/shared/conversation-identity.ts), plus
// unknown/legacy slugs: tool selection must not depend on which employee is asking.
const EMPLOYEE_SLUGS = [
  'prime', 'prime-boss', 'byte', 'byte-doc', 'byte-docs', 'tag', 'tag-ai', 'tag-categorizer',
  'crystal', 'crystal-ai', 'crystal-analytics', 'finley', 'finley-ai', 'goalie', 'goalie-ai',
  'ledger', 'ledger-ai', 'ledger-tax', 'blitz', 'blitz-ai', 'liberty', 'liberty-ai', 'chime', 'chime-ai',
  'custodian', 'custodian-ai', 'some-future-employee',
];

describe('no employee can be given the tool', () => {
  it.each(EMPLOYEE_SLUGS)('%s: tools_allowed listing the tool yields no such tool and no model definition', async () => {
    const { pickTools, toOpenAIToolDefs } = await import('../../../src/agent/tools/index');
    // The profile's tools_allowed is the only per-employee input to tool selection in chat.ts.
    const toolsAllowed = [RETIRED, 'vision_ocr_light', 'request_employee_handoff'];
    expect(Object.keys(pickTools(toolsAllowed))).not.toContain(RETIRED);
    expect(toOpenAIToolDefs(toolsAllowed).map(d => d.function.name)).not.toContain(RETIRED);
  });

  it('name variants do not reach the tool either', async () => {
    const { pickTools, toOpenAIToolDefs } = await import('../../../src/agent/tools/index');
    const variants = ['INGEST_STATEMENT_ENHANCED', ` ${RETIRED}`, `${RETIRED} `, 'ingest-statement-enhanced', 'ingestStatementEnhanced'];
    expect(pickTools(variants)).toEqual({});
    expect(toOpenAIToolDefs(variants)).toEqual([]);
  });

  it('chat.ts selects every employee\'s tools only through pickTools (no per-slug bypass)', () => {
    const chat = read('netlify/functions/chat.ts');
    expect(chat).not.toMatch(/toolModules\.get\(/);
    expect(chat).not.toMatch(/ingest_statement_enhanced|ingestStatementEnhanced/);
    // every place that assigns a tool-module map goes through pickTools
    const assigns = chat.match(/(?:toolModules|newToolModules|confirmedToolModules)\s*=\s*[^;\n]+/g) ?? [];
    // Allowed: built by pickTools, empty, a copy of an already-picked map, or the employee-handoff
    // result (itself either the previous map or pickTools(newEmployeeTools), asserted below).
    for (const a of assigns) {
      expect(a).toMatch(/pickTools\(|\{\}|Record<|toolModules\[|null|undefined|= toolModules$|= lifecycleResult\.newToolModules/);
    }
    expect(chat).toMatch(/let newToolModules = toolModules;/);
    expect(chat).toMatch(/newToolModules = pickTools\(newEmployeeTools\);/);
    expect((chat.match(/newToolModules = /g) ?? []).length).toBe(2);
  });
});

describe('alternate routes', () => {
  it('confirmation route (__CONFIRM_TOOL__): a signed confirmation for the tool resolves to nothing', async () => {
    const { pickTools } = await import('../../../src/agent/tools/index');
    expect(pickTools([RETIRED])[RETIRED]).toBeUndefined();
    expect(read('netlify/functions/chat.ts')).toMatch(/const confirmedToolModules = pickTools\(\[confirmedToolName\]\)/);
  });

  it('agent kernel: its hard-coded enhanced tool list still names the tool, but it is filtered out', async () => {
    const kernel = read('src/agent/kernel.ts');
    const list = kernel.match(/const enhancedTools = \[([\s\S]*?)\];/);
    expect(list).not.toBeNull();
    const ids = [...list![1].matchAll(/'([a-z_]+)'/g)].map(m => m[1]);
    expect(ids).toContain(RETIRED);
    const { pickTools, toOpenAIToolDefs } = await import('../../../src/agent/tools/index');
    expect(Object.keys(pickTools(ids))).not.toContain(RETIRED);
    expect(toOpenAIToolDefs(ids).map(d => d.function.name)).not.toContain(RETIRED);
    expect(kernel).toMatch(/const toolModules = pickTools\(enhancedTools\)/);
  });

  it('notification helper picks only its own tool', () => {
    const helper = read('netlify/functions/_shared/chimeNotificationHelper.ts');
    expect(helper).toMatch(/pickTools\(\['chime_generate_notification'\]\)/);
    expect(helper).not.toMatch(/ingest_statement_enhanced/);
  });

  it('the legacy function-level tool executor has no such tool', () => {
    expect(read('netlify/functions/_shared/tool-executor.ts')).not.toMatch(/ingest_statement|ingestStatement/);
  });

  it('even run directly through executeTool with the raw module, it refuses before storage/database', async () => {
    const { executeTool } = await import('../../../src/agent/tools/index');
    const impl = await import('../../../src/agent/tools/impl/ingest_statement_enhanced');
    serverClient.mockClear();
    const raw = { id: impl.id, description: 'raw', inputSchema: impl.inputSchema, outputSchema: impl.outputSchema, run: impl.execute, meta: {} };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberately bypassing the registry
    const r: any = await executeTool(raw as any, { fileId: '00000000-0000-4000-8000-0000000000bb/x/statement.pdf' }, { userId: 'u-synthetic-a' } as any);
    expect(JSON.stringify(r)).toMatch(/retired/);
    expect(serverClient).not.toHaveBeenCalled();
  });

  it('only the registry imports the tool implementation (no other route anywhere in app or function code)', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (['node_modules', '__tests__', '_legacy', 'functions_old', 'dist'].includes(e.name)) continue;
          walk(p);
        } else if (/\.(ts|tsx|js|mjs|cjs)$/.test(e.name) && !/\.test\./.test(e.name)) {
          if (/impl\/ingest_statement_enhanced/.test(fs.readFileSync(p, 'utf8'))) offenders.push(path.relative(ROOT, p).replace(/\\/g, '/'));
        }
      }
    };
    walk(path.join(ROOT, 'src'));
    walk(path.join(ROOT, 'netlify/functions'));
    expect(offenders).toEqual(['src/agent/tools/index.ts']);
  });
});
