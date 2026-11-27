/**
 * Owner GO 2026-11-27 "EMPLOYEE TOOL SAFETY APPROVAL" — regression tests for every entry path.
 * Prohibited (transaction-changing) tools are refused at: initial registration, employee handoff,
 * confirmation (AR-4b, static) and FINAL EXECUTION (executeTool, behavioural, here). Employee
 * availability and customer entitlements are enforced server-side. Tag's signed proposal + explicit
 * confirmation (tag-action commit) remains the only AI correction path and does not use executeTool.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { executeTool, type ToolModule } from '../../../src/agent/tools/index';
import { TRANSACTION_MUTATION_TOOLS } from '../../../src/shared/ai-action-safety';
import { setEntitlementResolver } from '../../../src/shared/capabilities';
import { isEmployeeProfileAvailable } from '../../../src/shared/employee-availability';

const chat = fs.readFileSync(path.join(__dirname, '../chat.ts'), 'utf8');
const fakeTool = (id: string) => {
  const run = vi.fn(async () => ({ ok: true }));
  const mod = { id, inputSchema: z.object({}).passthrough(), outputSchema: z.any(), run, meta: {} } as unknown as ToolModule;
  return { mod, run };
};

afterEach(() => setEntitlementResolver(null));

describe('final execution (executeTool)', () => {
  it('refuses EVERY transaction-changing tool before it runs, whoever calls', async () => {
    for (const id of TRANSACTION_MUTATION_TOOLS) {
      const { mod, run } = fakeTool(id);
      const r = await executeTool(mod, {}, { userId: 'synthetic-user' } as never, { employeeSlug: 'tag-ai' });
      expect(r, id).toMatchObject({ error: 'tool_not_permitted' });
      expect(run, id).not.toHaveBeenCalled();
    }
  });
  it('read-only tools still run (consultation and collaboration preserved)', async () => {
    const { mod, run } = fakeTool('tag_status');
    const r = await executeTool(mod, {}, { userId: 'synthetic-user' } as never, { employeeSlug: 'prime-boss' });
    expect(run).toHaveBeenCalledTimes(1);
    expect(r).not.toMatchObject({ error: 'tool_not_permitted' });
  });
  // Existing enforcement point (owner directive 2026-11-24, capabilities.ts) — verified, not rebuilt.
  it('customer entitlements are enforced at execution once a matrix is installed (none installed = unchanged)', async () => {
    setEntitlementResolver(async () => false);
    const denied = fakeTool('cash_flow_summary');
    expect(await executeTool(denied.mod, {}, { userId: 'synthetic-user' } as never, { employeeSlug: 'prime-boss' })).toMatchObject({ error: 'Capability not available', reason: 'not_entitled' });
    expect(denied.run).not.toHaveBeenCalled();
    setEntitlementResolver(null);
    const allowed = fakeTool('cash_flow_summary');
    await executeTool(allowed.mod, {}, { userId: 'synthetic-user' } as never, { employeeSlug: 'prime-boss' });
    expect(allowed.run).toHaveBeenCalledTimes(1);
  });
});

describe('employee availability (server-side, fail closed)', () => {
  it('only an existing, active, enabled profile is available', () => {
    expect(isEmployeeProfileAvailable({ is_active: true, is_enabled: true })).toBe(true);
    expect(isEmployeeProfileAvailable({})).toBe(true); // columns absent → not disabled
    expect(isEmployeeProfileAvailable({ is_active: false, is_enabled: true })).toBe(false);
    expect(isEmployeeProfileAvailable({ is_active: true, is_enabled: false })).toBe(false);
    expect(isEmployeeProfileAvailable(null)).toBe(false); // unknown slug
  });
  it('chat.ts: the profile read selects availability and fails closed on error / unknown slug', () => {
    expect(chat).toContain(".select('tools_allowed, system_prompt, is_active, is_enabled')");
    expect(chat).toContain('available: isEmployeeProfileAvailable(data as');
    expect(chat).toMatch(/console\.warn\(`\[Chat\] Employee profile query failed for \$\{normalizedSlug\}:`, error\);\n\s+return \{ tools_allowed: \[\], system_prompt: null, available: false \};/);
  });
  it('chat.ts: the requested employee and every handoff target must be available', () => {
    expect(chat).toMatch(/if \(!employeeProfile\.available\) \{\n\s+console\.warn\(`\[Chat\] EMPLOYEE UNAVAILABLE/);
    const handoff = chat.indexOf('const targetSlug = handoffData.target_slug;');
    expect(chat.slice(handoff, handoff + 500)).toMatch(/if \(!handoffTargetProfile\.available\) \{[\s\S]*?return null;/);
  });
});

describe('every executeTool call in chat.ts names the acting employee (entitlements + audit apply)', () => {
  it('no call site omits employeeSlug', () => {
    const lines = chat.split('\n');
    const sites = lines.map((l, i) => (/await executeTool\(/.test(l) ? i : -1)).filter(i => i >= 0);
    expect(sites.length).toBeGreaterThan(5);
    for (const i of sites) expect(lines.slice(i, i + 5).join('\n'), `chat.ts:${i + 1}`).toMatch(/employeeSlug/);
  });
});
