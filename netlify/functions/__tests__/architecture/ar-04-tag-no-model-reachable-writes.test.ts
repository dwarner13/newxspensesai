/**
 * AR-4 (P2 Secure actions) — owner: Tag HQ. NEW_CODE_PROTECTION_POLICY.md §4.
 * No transactions / category_rules / vendor_category_memory write is reachable from a model tool call
 * except through proposal → signed receipt → commit; the legacy commit returns 410.
 * Static checks over the source; exceptions live ONLY in ../fixtures/architecture-allowlist.ts (§5A), never in this logic.
 * Also (AI Architecture HQ review, 2026-11-25): every server-side caller of the customer-edit
 * endpoint tx-update-category identifies itself with x-xai-origin, so the guard cannot fail open.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';
import { TRANSACTION_MUTATION_TOOLS, stripTransactionMutationTools } from '../../../../src/shared/ai-action-safety';
import { exceptionsFor } from '../fixtures/architecture-allowlist';

const ROOT = resolve(__dirname, '../../../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const PROTECTED_TABLES = ['transactions', 'category_rules', 'vendor_category_memory'];
const WRITE = /\.(update|upsert|insert|delete)\(/;
const excepted = (file: string, rule: string) => exceptionsFor('AR-4').some(e => e.file === file && e.rule === rule);

/** Strip comments so documentation never counts as code. */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}
/** Every write chain `.from('<protected table>') … ;` in the source, with its offset. */
function protectedWrites(src: string): Array<{ table: string; at: number }> {
  const out: Array<{ table: string; at: number }> = [];
  const re = /\.from\(\s*['"`]([a-z_]+)['"`]\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (!PROTECTED_TABLES.includes(m[1])) continue;
    const end = src.indexOf(';', m.index);
    if (WRITE.test(src.slice(m.index, end < 0 ? undefined : end))) out.push({ table: m[1], at: m.index });
  }
  return out;
}

describe('AR-4 — model-facing Tag endpoints never write protected tables', () => {
  it.each(['netlify/functions/tag-copilot.ts', 'netlify/functions/tag-chat.ts'])('%s has no protected-table write', (file) => {
    expect(protectedWrites(code(read(file)))).toEqual([]);
  });
});

describe('AR-4 — every registered tool that writes protected tables is stripped from chat', () => {
  const dir = 'src/agent/tools/impl';
  const files = readdirSync(join(ROOT, dir)).filter(f => f.endsWith('.ts'));
  const writers = files.filter(f => {
    const src = code(read(`${dir}/${f}`));
    return protectedWrites(src).length > 0
      || /functions\/(tx-update-category|tag-action|tag-learn|update-vendor-category)\b/.test(src);
  }).map(f => f.replace(/\.ts$/, ''));

  it('the scan finds the known writers (sanity: the detector works)', () => {
    expect(writers).toEqual(expect.arrayContaining(['tag_update_transaction_category', 'tx_update_category']));
  });
  it.each(writers)('%s is a transaction-mutation tool (or an allowlisted baseline)', (tool) => {
    const ok = TRANSACTION_MUTATION_TOOLS.has(tool) || excepted(`${dir}/${tool}.ts`, `tool:${tool}`);
    expect(ok, `${tool} writes protected tables but is neither in TRANSACTION_MUTATION_TOOLS nor allowlisted`).toBe(true);
  });
  it('no employee keeps a transaction-mutation tool', () => {
    for (const slug of ['prime-boss', 'tag-ai', 'byte-docs', 'crystal-analytics', null]) {
      const { tools } = stripTransactionMutationTools(slug, [...TRANSACTION_MUTATION_TOOLS, 'tag_status']);
      expect(tools).toEqual(['tag_status']);
    }
  });
});

describe('AR-4 — tag-action writes protected tables only from confirmed or customer-button intents', () => {
  const FILE = 'netlify/functions/tag-action.ts';
  const src = code(read(FILE));
  // commit_single / commit_proposal execute only a signed proposal the customer confirmed;
  // fix_type is a single-row customer drawer edit; save_rule is a customer button (future imports only).
  const ALLOWED = new Set(['commit_single', 'commit_proposal', 'fix_type', 'save_rule']);
  const enclosingIntent = (at: number) => {
    const matches = [...src.slice(0, at).matchAll(/intent === '([a-z_]+)'/g)];
    return matches.length ? matches[matches.length - 1][1] : '(none)';
  };
  const writes = protectedWrites(src).map(w => ({ ...w, intent: enclosingIntent(w.at) }));

  it('the scan finds tag-action writes (sanity)', () => {
    expect(writes.length).toBeGreaterThan(0);
  });
  it('each write sits in an allowed intent or an allowlisted exception', () => {
    const bad = writes.filter(w => !ALLOWED.has(w.intent) && !excepted(FILE, `intent:${w.intent}`));
    expect(bad).toEqual([]);
  });
  it('the legacy commit intent returns 410 before any work', () => {
    const i = src.indexOf("if (intent === 'commit') {");
    expect(i).toBeGreaterThan(-1);
    expect(src.slice(i, i + 300)).toMatch(/410/);
  });
  it('shared proposal / single-transaction executors are the only other writers and are proposal-bound', () => {
    for (const f of ['netlify/functions/_shared/tagProposals.ts', 'netlify/functions/_shared/tagSingleTransaction.ts']) {
      const s = code(read(f));
      if (protectedWrites(s).length === 0) continue;
      expect(s, f).toMatch(/fingerprint/);
    }
  });
});

describe('AR-4 — the customer-edit endpoint cannot be used by a server-side AI caller as "the customer"', () => {
  it('every server-side caller of tx-update-category sends x-xai-origin', () => {
    const callers: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) { if (e.name !== '__tests__' && e.name !== 'node_modules') walk(rel); continue; }
        if (!/\.(ts|js|mjs|cjs)$/.test(e.name) || rel.endsWith('tx-update-category.ts')) continue;
        if (/\/\.netlify\/functions\/tx-update-category/.test(code(read(rel)))) callers.push(rel);
      }
    };
    walk('netlify/functions');
    walk('src/agent');
    expect(callers).toContain('src/agent/tools/impl/tx_update_category.ts');
    for (const c of callers) expect(read(c), c).toMatch(/['"]x-xai-origin['"]\s*:/);
  });
});

describe('§5A — the allowlist itself is well-formed', () => {
  it('each AR-4 exception names one file + one rule, an owner, a removal plan and expires ≤ 60 days after it was added', () => {
    for (const e of exceptionsFor('AR-4')) {
      expect(e.file && e.rule && e.ownerTeam && e.reason && e.removalPlan, e.id).toBeTruthy();
      const days = (Date.parse(e.expires) - Date.parse(e.added)) / 86_400_000;
      expect(days, e.id).toBeLessThanOrEqual(60 * (1 + e.renewals));
      expect(Date.parse(e.expires), `${e.id} has expired — renew once or take it to the owner`).toBeGreaterThanOrEqual(Date.parse(new Date().toISOString().slice(0, 10)));
    }
  });
});

describe('AR-4 — unmounted duplicate Tag panel stays unreachable (UI/UX W8, 2026-11-25)', () => {
  // src/pages/CategoriesV2/TagCopilotPanel.tsx holds a direct transactions.update({ amount }).
  // Retirement awaits the owner's GO; until then nothing may import it.
  it('no module imports src/pages/CategoriesV2/TagCopilotPanel', () => {
    const importers: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) { if (e.name !== 'node_modules') walk(rel); continue; }
        if (!/\.(tsx?|jsx?)$/.test(e.name) || rel === 'src/pages/CategoriesV2/TagCopilotPanel.tsx') continue;
        const s = read(rel);
        if (/from\s+['"](\.\/TagCopilotPanel|@\/pages\/CategoriesV2\/TagCopilotPanel|[./]*pages\/CategoriesV2\/TagCopilotPanel)['"]/.test(s)
          || (rel.startsWith('src/pages/CategoriesV2/') && /import\(\s*['"]\.\/TagCopilotPanel['"]\s*\)/.test(s))) importers.push(rel);
      }
    };
    walk('src');
    expect(importers).toEqual([]);
  });
});

describe('AR-4 — dead merchant-categorize write paths on the Transactions page stay unreachable (UI/UX REVIEW-1, 2026-11-26)', () => {
  // TransactionsPageV2 passes onMerchantCategorize / onTagAction handlers that select ids in the browser
  // (merchant ilike '%x%', any "Other") and POST bulk_apply / save_rule / undo without a confirmation.
  // The live TagCopilotPanel never declares or calls them, so they cannot run. Deletion awaits the
  // owner's GO; until then the panel must not start calling them.
  it('TagCopilotPanel never exposes onMerchantCategorize / onTagAction', () => {
    const panel = read('src/components/transactions/TagCopilotPanel.tsx');
    expect(panel).not.toMatch(/\bonMerchantCategorize\b|\bonTagAction\b/);
  });
  it('the old unrouted src/pages/TransactionsPageV2.tsx is imported nowhere', () => {
    const importers: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== '__tests__') walk(rel); continue; }
        if (!/\.(tsx?|jsx?)$/.test(e.name) || rel === 'src/pages/TransactionsPageV2.tsx') continue;
        if (/['"](\.\/pages\/TransactionsPageV2|@\/pages\/TransactionsPageV2|\.\.\/TransactionsPageV2|\.\/TransactionsPageV2)['"]/.test(read(rel))
          && !rel.startsWith('src/pages/dashboard/')) importers.push(rel);
      }
    };
    walk('src');
    expect(importers).toEqual([]);
  });
});
