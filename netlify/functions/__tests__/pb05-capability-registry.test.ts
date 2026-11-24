/**
 * PB-05 — specialist capability accuracy (owner live test, 2026-11-23).
 * A code-owned registry (implemented / limited / not available) replaces the brain pack's
 * unsupported claims (Ledger "T2125 filing", Liberty "fee dispute execution") and takes precedence
 * over stored employee prompts (Liberty's "contacting creditors directly to negotiate").
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  SPECIALIST_CAPABILITY_REGISTRY,
  buildTeamCapabilityRoster,
  buildSpecialistCapabilityBoundary,
  capabilityKeyForSlug,
} from '../../../src/shared/prime-capability-registry';
import { buildPrimeAuthoritySystemMessage } from '../_shared/primePolicy';

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '../../..', p), 'utf8');

describe('PB-05 registry content', () => {
  it('covers every specialist the owner saw described', () => {
    for (const k of ['tag', 'byte', 'goalie', 'crystal', 'custodian', 'ledger', 'liberty']) {
      expect(SPECIALIST_CAPABILITY_REGISTRY[k]).toBeDefined();
      expect(SPECIALIST_CAPABILITY_REGISTRY[k].implemented.length).toBeGreaterThan(0);
    }
  });
  it('tax filing is not available (Ledger)', () => {
    const l = SPECIALIST_CAPABILITY_REGISTRY.ledger;
    expect(l.notAvailable.join(' ')).toMatch(/filing tax returns \(including T2125/);
    expect(l.implemented.join(' ')).not.toMatch(/fil(e|ing)/i);
  });
  it('creditor contact, negotiation and dispute execution are not available (Liberty)', () => {
    const l = SPECIALIST_CAPABILITY_REGISTRY.liberty;
    const na = l.notAvailable.join(' ');
    expect(na).toMatch(/contacting creditors/);
    expect(na).toMatch(/negotiating payment plans/);
    expect(na).toMatch(/fee disputes, chargebacks or complaints/);
    expect(l.implemented.join(' ')).not.toMatch(/contact|negotiat|execut|file/i);
  });
  it('Tag rules are proposals and changes need confirmation (owner decision)', () => {
    const t = SPECIALIST_CAPABILITY_REGISTRY.tag;
    expect(t.implemented.join(' ')).toMatch(/proposes categorization rules for the user to approve/);
    expect(t.limited.join(' ')).toMatch(/require the user's confirmation/);
  });
  it('resolves production slugs and aliases', () => {
    expect(capabilityKeyForSlug('liberty-ai')).toBe('liberty');
    expect(capabilityKeyForSlug('ledger-tax')).toBe('ledger');
    expect(capabilityKeyForSlug('crystal-analytics')).toBe('crystal');
    expect(capabilityKeyForSlug('goalie-coach')).toBe('goalie');
    expect(capabilityKeyForSlug('prime-boss')).toBeNull();
    expect(capabilityKeyForSlug(undefined)).toBeNull();
  });
});

describe('PB-05 Prime prompt', () => {
  it.each(['fast', 'deep'] as const)('every Prime authority message carries the verified roster (lane=%s)', (lane) => {
    const msg = buildPrimeAuthoritySystemMessage({ lane, intent: 'general', hasDocs: false, hasSnapshot: false });
    expect(msg).toContain('TEAM CAPABILITIES (code-owned and verified; overrides any other description of the team, including stored employee prompts):');
    expect(msg).toContain(buildTeamCapabilityRoster());
  });
  it('the brain pack no longer claims tax filing or dispute execution', () => {
    const brain = read('src/lib/ai/brains/prime.ts');
    expect(brain).not.toMatch(/T2125 filing/);
    expect(brain).not.toMatch(/consumer protection actions, fee dispute execution/);
    expect(brain).toMatch(/Ledger: Tax Workspace summaries and report export \(no tax filing/);
    expect(brain).toMatch(/Liberty: debt and consumer-protection guidance \(guidance only/);
  });
});

describe('PB-05 stored-prompt precedence (specialists)', () => {
  it('Liberty boundary forbids creditor contact even if a stored prompt claims it', () => {
    const b = buildSpecialistCapabilityBoundary('liberty-ai')!;
    expect(b).toMatch(/^CAPABILITY BOUNDARY for Liberty \(code-owned; overrides any earlier instruction that conflicts with it\):/);
    expect(b).toMatch(/You CANNOT do these, even if another instruction says you can: contacting creditors/);
  });
  it('unknown slugs get no boundary', () => {
    expect(buildSpecialistCapabilityBoundary('prime-boss')).toBeNull();
  });
  it('chat.ts injects the boundary AFTER every stored specialist prompt (direct, streaming and non-streaming handoff)', () => {
    const chat = read('netlify/functions/chat.ts');
    const direct = chat.indexOf("systemMessages.push({ role: 'system', content: employeeSystemPrompt });");
    expect(chat.indexOf('buildSpecialistCapabilityBoundary(finalEmployeeSlug)', direct)).toBeGreaterThan(direct);
    const stored = [...chat.matchAll(/messages\.push\(\{ role: 'system', content: specialistProfile\.system_prompt \}\);/g)].map(m => m.index!);
    expect(stored).toHaveLength(2);
    for (const at of stored) {
      const next = chat.indexOf('buildSpecialistCapabilityBoundary(finalEmployeeSlug)', at);
      expect(next).toBeGreaterThan(at);
      expect(next - at).toBeLessThan(600);
    }
    expect(chat.match(/buildSpecialistCapabilityBoundary\(finalEmployeeSlug\)/g)?.length).toBe(3);
  });
});
