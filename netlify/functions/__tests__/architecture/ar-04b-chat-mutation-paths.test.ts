/**
 * AR-4b (AI Architecture HQ T1, 2026-11-27) — owner: Prime HQ. Companion to Tag HQ's AR-4.
 * chat.ts must never give a model, or a chat confirmation, a transaction-changing tool (T-ACT-SAFE):
 *  - turn start: every tool list passes stripTransactionMutationTools after all code additions;
 *  - after a handoff: the target employee's database list is stripped the same way;
 *  - confirmation execution: a confirmed mutation tool is refused before any module is loaded.
 * Static over the source; any NEW pickTools() site must be classified here.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { TRANSACTION_MUTATION_TOOLS } from '../../../../src/shared/ai-action-safety';

const chat = fs.readFileSync(path.join(__dirname, '../../chat.ts'), 'utf8');
const lines = chat.split('\n');

describe('AR-4b: no transaction-changing tool reaches a model or a confirmation in chat.ts', () => {
  it('the turn-start strip runs after every code addition to employeeTools', () => {
    const strip = chat.indexOf('const safe = stripTransactionMutationTools(finalEmployeeSlug, employeeTools);');
    expect(strip).toBeGreaterThan(0);
    // every turn-start pickTools(employeeTools) / employeeTools mutation precedes the strip
    const after = chat.slice(strip);
    const nextHandoff = after.indexOf('// Reload employee profile and tools for target employee');
    expect(after.slice(0, nextHandoff)).not.toMatch(/employeeTools = \[\.\.\.employeeTools/);
  });

  it('after a handoff the target employee\'s database tool list is stripped before modules are loaded', () => {
    const reload = chat.indexOf('// Reload employee profile and tools for target employee');
    const block = chat.slice(reload, reload + 1600);
    const strip = block.indexOf('stripTransactionMutationTools(targetSlug, newProfile.tools_allowed)');
    const pick = block.indexOf('newToolModules = pickTools(newEmployeeTools);');
    expect(strip).toBeGreaterThan(0);
    expect(pick).toBeGreaterThan(strip);
    expect(block).toContain('newEmployeeTools = safeAfterHandoff.tools;');
    expect(block).not.toContain('newEmployeeTools = newProfile.tools_allowed;');
  });

  it('a chat confirmation refuses every transaction-changing tool before loading it', () => {
    const refuse = chat.indexOf('if (TRANSACTION_MUTATION_TOOLS.has(confirmedToolName)) {');
    const pick = chat.indexOf('const confirmedToolModules = pickTools([confirmedToolName]);');
    expect(refuse).toBeGreaterThan(0);
    expect(pick).toBeGreaterThan(refuse);
    expect(TRANSACTION_MUTATION_TOOLS.has('tag_update_transaction_category')).toBe(true);
  });

  it('every pickTools() site in chat.ts is classified (turn start before the strip, the strip, confirmation, handoff)', () => {
    const sites = lines.map((l, i) => (/pickTools\(/.test(l) ? i : -1)).filter(i => i >= 0);
    const stripLine = lines.findIndex(l => l.includes('const safe = stripTransactionMutationTools(finalEmployeeSlug, employeeTools);'));
    for (const i of sites) {
      const l = lines[i];
      const ok =
        (l.includes('toolModules = pickTools(employeeTools);') && i <= stripLine + 3) || // turn-start assembly / the strip itself
        l.includes('const confirmedToolModules = pickTools([confirmedToolName]);') ||
        l.includes('newToolModules = pickTools(newEmployeeTools);');
      expect(ok, `unclassified pickTools at chat.ts:${i + 1}: ${l.trim()}`).toBe(true);
    }
  });
});
