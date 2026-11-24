/**
 * Employee capability / entitlement enforcement point (owner directive 2026-11-24).
 * Today: allow-all (no paid restrictions active). Proven here: every model tool call and every
 * server-side Prime consultation passes through ONE hook, and once a resolver is installed it
 * denies by default.
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import {
  authorizeCapability,
  setEntitlementResolver,
  capabilityForTool,
  TOOL_CAPABILITIES,
} from '../../../src/shared/capabilities';
import { executeTool, type ToolModule } from '../../../src/agent/tools/index';

afterEach(() => setEntitlementResolver(null));

describe('capability ownership', () => {
  it('Tag-specialty tools belong to Tag; statement inventory to Byte; forecasts to Crystal/Goalie', () => {
    expect(capabilityForTool('tag_status')).toMatchObject({ ownerEmployee: 'tag', kind: 'read', classified: true });
    expect(capabilityForTool('tag_update_transaction_category')).toMatchObject({ ownerEmployee: 'tag', kind: 'write' });
    expect(capabilityForTool('statement_coverage')).toMatchObject({ ownerEmployee: 'byte' });
    expect(capabilityForTool('analytics_forecast').ownerEmployee).toBe('crystal');
    expect(capabilityForTool('goalie_create_goal')).toMatchObject({ ownerEmployee: 'goalie', kind: 'write' });
  });
  it('unknown tools are visibly unclassified, never silently trusted', () => {
    expect(capabilityForTool('brand_new_tool')).toMatchObject({ classified: false, capability: 'unclassified.brand_new_tool' });
  });
  it('every Prime runtime tool is classified', () => {
    const chat = fs.readFileSync(path.resolve(__dirname, '../chat.ts'), 'utf8');
    const runtime = [...chat.matchAll(/employeeTools = \[\.\.\.employeeTools, '([a-z_]+)'\]/g)].map(m => m[1]);
    for (const t of runtime) expect(TOOL_CAPABILITIES[t], `unclassified Prime tool: ${t}`).toBeDefined();
  });
});

describe('authorizeCapability', () => {
  const req = { userId: 'u1', actingEmployee: 'prime-boss', toolId: 'tag_status', via: 'prime_consultation' as const };
  it('allows everything until a resolver is installed (no paid restrictions active)', async () => {
    expect(await authorizeCapability(req)).toMatchObject({ allowed: true, reason: 'not_enforced_yet' });
  });
  it('with a resolver: entitled → allowed; not entitled → denied', async () => {
    setEntitlementResolver(async (_r, spec) => spec.ownerEmployee !== 'tag');
    expect(await authorizeCapability({ ...req, toolId: 'tx_search' })).toMatchObject({ allowed: true, reason: 'entitled' });
    expect(await authorizeCapability(req)).toMatchObject({ allowed: false, reason: 'not_entitled' });
  });
  it('with a resolver: deny by default for unknown customer, unclassified capability, resolver failure', async () => {
    setEntitlementResolver(async () => { throw new Error('down'); });
    expect(await authorizeCapability({ ...req, userId: '' })).toMatchObject({ allowed: false, reason: 'unknown_customer' });
    expect(await authorizeCapability({ ...req, toolId: 'mystery' })).toMatchObject({ allowed: false, reason: 'unclassified_capability' });
    expect(await authorizeCapability(req)).toMatchObject({ allowed: false, reason: 'not_entitled' });
  });
});

describe('enforcement points', () => {
  const fakeTool: ToolModule = {
    id: 'tag_status',
    description: 'test',
    inputSchema: z.object({}).strict(),
    outputSchema: z.any(),
    run: async () => ({ ok: true, value: 'ran' }),
    meta: { mutates: false },
  };
  it('executeTool consults the hook and refuses without running the tool when denied', async () => {
    let ran = false;
    const tool = { ...fakeTool, run: async () => { ran = true; return { ok: true }; } };
    setEntitlementResolver(async () => false);
    const r = await executeTool(tool, {}, { userId: 'u1' } as never, { employeeSlug: 'prime-boss' });
    expect(r).toMatchObject({ error: 'Capability not available', reason: 'not_entitled', capability: 'tag.categorization_status' });
    expect(ran).toBe(false);
  });
  it('executeTool runs normally while no resolver is installed', async () => {
    let ran = false;
    const tool = { ...fakeTool, run: async () => { ran = true; return { ok: true }; } };
    await executeTool(tool, {}, { userId: 'u1' } as never, { employeeSlug: 'prime-boss' });
    expect(ran).toBe(true);
  });
  it('Prime server-side consultations (L-A tag_status, L-B statement_coverage) go through the same hook first', () => {
    const chat = fs.readFileSync(path.resolve(__dirname, '../chat.ts'), 'utf8');
    expect(chat).toMatch(/const tagCap = await authorizeCapability\(\{ userId, actingEmployee: finalEmployeeSlug, toolId: 'tag_status', via: 'prime_consultation' \}\);\n\s+const tagResult = tagCap\.allowed/);
    expect(chat).toMatch(/const covCap = await authorizeCapability\(\{ userId, actingEmployee: finalEmployeeSlug, toolId: 'statement_coverage', via: 'prime_consultation' \}\);\n\s+const covResult = covCap\.allowed/);
  });
});
