/**
 * Prime V1-A CP4.3 — pre-model timing instrumentation (observability only).
 *
 * buildStageTimingPayload must emit only approved keys with finite, non-negative
 * millisecond values, include the open stage without mutating orchestration state,
 * and omit (never zero-fill) anything missing. chat.ts wiring is checked structurally.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// chat.ts constructs API clients at module load (no network until used); placeholder
// env values let the pure helper be imported. Nothing here makes a request.
let buildStageTimingPayload: typeof import('../../../netlify/functions/chat').buildStageTimingPayload;
beforeAll(async () => {
  process.env.OPENAI_API_KEY ||= 'test-placeholder';
  process.env.SUPABASE_URL ||= 'http://localhost:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-placeholder';
  ({ buildStageTimingPayload } = await import('../../../netlify/functions/chat'));
}, 60_000);

const STAGES = ['ingress', 'guardrails', 'routing', 'deterministic_brains', 'memory', 'model_config', 'model_streaming', 'model_non_streaming', 'respond'];
const OPS = ['auth', 'rate_limit', 'guardrail_config', 'input_guardrails', 'employee_profile', 'employee_key', 'ensure_thread', 'session', 'memory', 'history', 'financial_snapshot', 'profile', 'p31c', 'financial_position', 'user_message_insert', 'model_config_lookup'];
const MARKS = ['memory_start', 'memory_end', 'context_assembly_end', 'prime_openai_start'];

const timings = () => ({
  request_started_at: 1_000,
  stage_started_at: 6_399,
  stage_durations_ms: { ingress: 400, guardrails: 1_500, routing: 900, deterministic_brains: 256, memory: 2_343 } as Record<string, number>,
});

const allNumbersValid = (o: Record<string, unknown>) =>
  Object.values(o).every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0);

describe('CP4.3 buildStageTimingPayload', () => {
  it('1–3. includes completed stages as finite, non-negative numbers', () => {
    const p = buildStageTimingPayload({ timings: timings(), openStage: 'model_config', now: 6_500 });
    expect(p.stages).toMatchObject({ ingress: 400, guardrails: 1_500, routing: 900, deterministic_brains: 256, memory: 2_343 });
    expect(allNumbersValid(p.stages)).toBe(true);
  });

  it('4. the open stage is included as now − stage_started_at', () => {
    const p = buildStageTimingPayload({ timings: timings(), openStage: 'model_config', now: 6_500 });
    expect(p.stages.model_config).toBe(101);
  });

  it('open stage time is ADDED to an already-recorded duration for that stage', () => {
    const t = timings();
    t.stage_durations_ms.respond = 10;
    const p = buildStageTimingPayload({ timings: t, openStage: 'respond', now: 6_409 });
    expect(p.stages.respond).toBe(20);
  });

  it('5. computing the open stage does not mutate the input timings', () => {
    const t = timings();
    const before = JSON.stringify(t);
    buildStageTimingPayload({ timings: t, openStage: 'model_config', now: 9_999 });
    expect(JSON.stringify(t)).toBe(before);
    expect(t.stage_durations_ms.model_config).toBeUndefined();
  });

  it('6–8. missing stages, ops and marks are omitted, not zero-filled', () => {
    const p = buildStageTimingPayload({ timings: timings(), openStage: 'model_config', ops: { auth: 120 }, marks: { memory_start: 3_056 }, now: 6_500 });
    expect(p.stages).not.toHaveProperty('model_streaming');
    expect(p.stages).not.toHaveProperty('respond');
    expect(Object.keys(p.ops)).toEqual(['auth']);
    expect(Object.keys(p.marks)).toEqual(['memory_start']);
  });

  it('9. a genuinely measured zero is kept', () => {
    const p = buildStageTimingPayload({ timings: timings(), ops: { p31c: 0 }, marks: { memory_start: 0 }, now: 6_399 });
    expect(p.ops.p31c).toBe(0);
    expect(p.marks.memory_start).toBe(0);
  });

  it('10–12. negative, NaN and Infinity values are omitted', () => {
    const t = timings();
    t.stage_durations_ms.respond = -5;
    t.stage_durations_ms.model_streaming = Number.NaN;
    const p = buildStageTimingPayload({
      timings: t,
      ops: { auth: -1, session: Number.NaN, memory: Number.POSITIVE_INFINITY, history: 12 },
      marks: { memory_start: -3, memory_end: Number.NaN, context_assembly_end: Number.NEGATIVE_INFINITY, prime_openai_start: 5_399 },
      now: 6_500,
    });
    expect(p.stages).not.toHaveProperty('respond');
    expect(p.stages).not.toHaveProperty('model_streaming');
    expect(p.ops).toEqual({ history: 12 });
    expect(p.marks).toEqual({ prime_openai_start: 5_399 });
  });

  it('an open stage with a clock going backwards is not invented', () => {
    const p = buildStageTimingPayload({ timings: timings(), openStage: 'model_config', now: 6_000 });
    expect(p.stages).not.toHaveProperty('model_config');
    expect(p.stages.memory).toBe(2_343);
  });

  it('13–16. only approved keys can appear, whatever the input contains', () => {
    const p = buildStageTimingPayload({
      timings: { ...timings(), stage_durations_ms: { ...timings().stage_durations_ms, userId: 1, message: 2 } },
      openStage: 'not_a_stage',
      ops: { auth: 10, userId: 11, sessionId: 12, threadId: 13, message: 14, merchant: 15, amount: 16, messages: 17, openai_ttft: 18, profileName: 19 },
      marks: { memory_end: 20, email: 21, category: 22 },
      now: 6_500,
    });
    expect(Object.keys(p.stages).every(k => STAGES.includes(k))).toBe(true);
    expect(Object.keys(p.ops).every(k => OPS.includes(k))).toBe(true);
    expect(Object.keys(p.marks).every(k => MARKS.includes(k))).toBe(true);
    expect(Object.keys(p).sort()).toEqual(['marks', 'ops', 'stages', 'total']);
    const json = JSON.stringify(p);
    for (const banned of ['userId', 'sessionId', 'threadId', 'message', 'merchant', 'amount', 'email', 'category', 'profileName']) {
      expect(json).not.toContain(banned);
    }
    expect(json).not.toMatch(/"[^"]*":"/); // no string values anywhere
  });

  it('non-number op values (strings, objects) never pass through', () => {
    const p = buildStageTimingPayload({ timings: timings(), ops: { auth: '120' as unknown as number, session: { x: 1 } as unknown as number }, now: 6_500 });
    expect(p.ops).toEqual({});
  });

  it('17. total is now − request_started_at, finite and non-negative', () => {
    expect(buildStageTimingPayload({ timings: timings(), now: 13_893 }).total).toBe(12_893);
    expect(buildStageTimingPayload({ timings: timings(), now: 500 }).total).toBeUndefined();
  });

  it('18. does not throw when optional data is absent', () => {
    expect(() => buildStageTimingPayload({ timings: { request_started_at: 0, stage_started_at: 0, stage_durations_ms: {} }, now: 0 })).not.toThrow();
    expect(buildStageTimingPayload({ timings: { request_started_at: 0, stage_started_at: 0, stage_durations_ms: {} }, openStage: null, now: 0 }))
      .toEqual({ stages: {}, ops: {}, marks: {}, total: 0 });
  });
});

describe('CP4.3 chat.ts wiring (structural)', () => {
  const chatPath = path.resolve(__dirname, '../../../netlify/functions/chat.ts');
  const chat = fs.readFileSync(chatPath, 'utf8');

  it('the timing line is emitted once, inside emitOrchSummary, wrapped in try/catch', () => {
    const start = chat.indexOf('const emitOrchSummary = (success: boolean');
    const end = chat.indexOf('\n  };\n', start);
    const body = chat.slice(start, end);
    expect(body).toContain('if (orchSummaryEmitted) return;');
    expect(body).toContain('[ChatTiming][STAGES]');
    expect(body).toMatch(/try \{\s+const timingPayload = buildStageTimingPayload\(/);
    expect(body).toContain('} catch {');
    expect(chat.match(/\[ChatTiming\]\[STAGES\]/g)?.length).toBe(1);
  });

  it('the line logs only the short request id, employee, path, success and the payload', () => {
    expect(chat).toContain("console.log(`[ChatTiming][STAGES] request=${String(summaryCtx.requestId || '').slice(0, 12)} employee=${summaryCtx.employee || 'null'} path=${summaryCtx.deterministic_path || 'model'} success=${success ? 'true' : 'false'} ${JSON.stringify(timingPayload)}`);");
  });

  it('open stage is passed as data; orchCtx timings are not written for logging', () => {
    expect(chat).toContain('timings: orchCtx.timings,');
    expect(chat).toContain('openStage: orchCtx.stage,');
    // the only WRITE to stage_durations_ms is setStage's existing accumulation
    expect(chat.match(/stage_durations_ms\[[^\]]+\]\s*=(?!=)/g)).toEqual(['stage_durations_ms[prev] =']);
  });

  it('every new op timer records an approved key', () => {
    for (const key of ['rate_limit', 'guardrail_config', 'input_guardrails', 'employee_profile', 'employee_key', 'ensure_thread', 'financial_snapshot', 'p31c', 'financial_position', 'user_message_insert', 'model_config_lookup']) {
      expect(chat).toContain(`timingLogs.${key} = `);
    }
    expect(chat).toContain('timingLogs.p31c = p31cResult.totalDurationMs;');
    for (const key of MARKS) expect(chat).toContain(`timingMarks.${key} = `);
  });

  it('19–20. the CP4.3 diff is purely additive: no existing line (setStage, awaits, returns) changed or moved', () => {
    let diff = '';
    try {
      // Pinned to CP4.3's own commit (7b5981b → 8487842). Comparing against HEAD would
      // flag any LATER uncommitted chat.ts change (e.g. R1) as if it were CP4.3's diff.
      diff = execSync('git diff -U0 7b5981b2c9501bf4ffbbaf2de39a1883ba65bdbc 84878420dca3f925fbf90a08385b90072562ba24 -- netlify/functions/chat.ts', { cwd: path.resolve(__dirname, '../../..'), encoding: 'utf8' });
    } catch {
      return; // git unavailable in this environment — the other structural checks still apply
    }
    if (!diff) return; // already committed: nothing to compare
    const removed = diff.split('\n').filter(l => l.startsWith('-') && !l.startsWith('---'));
    expect(removed).toEqual([]);
    const added = diff.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'));
    expect(added.some(l => /setStage\(/.test(l))).toBe(false);
    expect(added.some(l => /\breturn\b/.test(l) && !/return payload;|return \{ stages|=> typeof v/.test(l))).toBe(false);
  });
});
