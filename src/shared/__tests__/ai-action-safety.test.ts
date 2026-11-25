/**
 * Tag action safety (owner 2026-11-25): no AI employee except Tag can receive a
 * transaction-modifying tool in chat.ts; every mutating tool in the registry is classified.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { TRANSACTION_MUTATION_TOOLS, stripTransactionMutationTools } from '../ai-action-safety';

const root = path.resolve(__dirname, '../../..');
const registry = fs.readFileSync(path.join(root, 'src/agent/tools/index.ts'), 'utf8');

/** Mutating tools in the registry (meta.mutates: true). */
function mutatingTools(): string[] {
  const out: string[] = [];
  const re = /\['([a-z0-9_]+)',\s*\{[\s\S]*?meta:\s*\{([\s\S]*?)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(registry))) if (/mutates:\s*true/.test(m[2])) out.push(m[1]);
  return out;
}

/** Mutating tools that do NOT touch transactions (reviewed 2026-11-25). */
const NON_TRANSACTION_MUTATIONS = new Set([
  'ingest_statement_enhanced', // import pipeline (Byte/Attachments), its own confirmation
  'byte_rename_import',        // renames an import record, not transactions
  'manage_knowledge_pack',
  'create_org',
  'invite_member',
  'set_reminder',
  'create_goal',
  'update_goal',
  'goalie_create_goal',
  'goalie_update_goal_progress',
]);

describe('every mutating tool is classified (a new one fails until reviewed)', () => {
  it('registry mutating tools ⊆ transaction set ∪ reviewed non-transaction set', () => {
    const tools = mutatingTools();
    expect(tools.length).toBeGreaterThan(0);
    const unclassified = tools.filter(t => !TRANSACTION_MUTATION_TOOLS.has(t) && !NON_TRANSACTION_MUTATIONS.has(t));
    expect(unclassified).toEqual([]);
  });
  it('every tool in the transaction set exists in the registry and mutates', () => {
    const tools = new Set(mutatingTools());
    for (const t of TRANSACTION_MUTATION_TOOLS) expect(tools.has(t), t).toBe(true);
  });
});

describe('non-Tag employees never receive transaction-modifying tools', () => {
  const all = ['tx_search', 'tag_status', ...TRANSACTION_MUTATION_TOOLS, 'create_goal'];
  for (const slug of ['prime-boss', 'prime', 'crystal-analytics', 'finley-ai', 'goalie-goals', 'ledger-tax', 'byte-docs', 'custodian', undefined]) {
    it(`${slug ?? '(no slug)'}: all removed, others kept`, () => {
      const r = stripTransactionMutationTools(slug, all);
      expect(r.tools).toEqual(['tx_search', 'tag_status', 'create_goal']);
      expect(new Set(r.removed)).toEqual(new Set(TRANSACTION_MUTATION_TOOLS));
    });
  }
  it('Tag keeps its tools (its writes go through the signed proposal architecture)', () => {
    for (const slug of ['tag-ai', 'tag']) expect(stripTransactionMutationTools(slug, all).removed).toEqual([]);
  });
  it('chat.ts applies the guard after the database tool list is loaded and before tools are used', () => {
    const chat = fs.readFileSync(path.join(root, 'netlify/functions/chat.ts'), 'utf8');
    const iGuard = chat.indexOf('const safe = stripTransactionMutationTools(finalEmployeeSlug, employeeTools);');
    const iProfile = chat.indexOf('employeeTools = employeeProfile.tools_allowed;');
    const iThread = chat.indexOf('// 5. ENSURE THREAD EXISTS');
    expect(iGuard).toBeGreaterThan(iProfile);
    expect(iGuard).toBeLessThan(iThread);
    // the existing identity gate for tag_update_transaction_category stays (Tag + verified plugin binding)
    expect(chat).toContain('function checkMutationIdentityGate(');
  });
});
