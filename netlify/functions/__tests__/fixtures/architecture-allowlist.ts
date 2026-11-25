/**
 * Architecture-check exceptions (NEW_CODE_PROTECTION_POLICY §5A): one file and one rule per entry,
 * an owner team, the reason, the plan item that removes it, expiry ≤ 60 days after it was added,
 * at most one renewal (then an owner decision). Tests read this file; exceptions are NEVER coded
 * into test logic. Interim location agreed by Prime HQ + AI Architecture HQ (2026-11-25) until
 * Development HQ settles E-1…E-4.
 */
export type ArchException = {
  id: string;
  ar: 'AR-4' | 'AR-6' | 'AR-13' | 'AR-17';
  /** repo-relative file the exception covers */
  file: string;
  /** the single thing in that file that is excepted (an intent, a tool, a callee) */
  rule: string;
  ownerTeam: string;
  reason: string;
  removalPlan: string;
  added: string;   // YYYY-MM-DD
  expires: string; // YYYY-MM-DD, ≤ 60 days after `added` (+60 per renewal)
  renewals: 0 | 1;
  /** 'unreachable' = the code is present but cannot run today (kept visible until deleted). */
  status?: 'active' | 'unreachable';
};

export const ARCH_EXCEPTIONS: ReadonlyArray<ArchException> = [
  {
    id: 'AR4-TAG-01', ar: 'AR-4', file: 'netlify/functions/tag-action.ts', rule: 'intent:bulk_apply',
    ownerTeam: 'Tag HQ',
    reason: 'Interim hardened bulk_apply (gap-only, guarded, verified count) kept by owner decision "UPLOAD APPLY ALL" until the replacement is verified.',
    removalPlan: 'UI/UX Studio switches UploadPageV2 "Apply all" to propose_import_suggestions → commit_proposal; once verified, Tag HQ returns 410 for bulk_apply (coordinated with Prime HQ).',
    added: '2026-11-25', expires: '2027-01-24', renewals: 0,
  },
  {
    id: 'AR4-ATT-01', ar: 'AR-4', file: 'src/agent/tools/impl/ingest_statement_enhanced.ts', rule: 'tool:ingest_statement_enhanced',
    ownerTeam: 'Attachments HQ (tool) / Prime HQ (registry, ai-action-safety)',
    reason: 'Baseline found by Tag HQ 2026-11-25: a registered tool that INSERTS transactions and is not in TRANSACTION_MUTATION_TOOLS; chat.ts reachability depends on employee_profiles.tools_allowed (unversioned).',
    removalPlan: 'Owner decision: add to TRANSACTION_MUTATION_TOOLS (stripped from chat) or delete in favour of the smart-import pipeline.',
    added: '2026-11-25', expires: '2027-01-24', renewals: 0,
  },
  {
    id: 'AR17-TAG-01', ar: 'AR-17', file: 'netlify/functions/tag-background-sweep.ts', rule: 'callee:fetch',
    ownerTeam: 'Tag HQ',
    reason: 'Unawaited prime-briefing trigger after the post-import sweep (plan item 7).',
    removalPlan: 'Plan item 7 interim: await with a short timeout and record failure honestly; durable outbox needs a migration + separate owner GO.',
    added: '2026-11-25', expires: '2027-01-24', renewals: 0,
  },
  {
    id: 'AR17-TAG-02', ar: 'AR-17', file: 'netlify/functions/tag-copilot.ts', rule: 'callee:fetch',
    ownerTeam: 'Tag HQ',
    reason: 'Prime inbox "books are clean" notice; guarded by action.applied, which tag-copilot never sets since T-LIVE-02 (proposals only).',
    removalPlan: 'Delete with the next tag-copilot change under a GO (dead code).',
    added: '2026-11-25', expires: '2027-01-24', renewals: 0, status: 'unreachable',
  },
  {
    id: 'AR17-TAG-03', ar: 'AR-17', file: 'netlify/functions/tag-copilot.ts', rule: 'callee:logAiActivity',
    ownerTeam: 'Tag HQ',
    reason: 'Activity log for an applied copilot action; unreachable for the same reason as AR17-TAG-02.',
    removalPlan: 'Delete with AR17-TAG-02.',
    added: '2026-11-25', expires: '2027-01-24', renewals: 0, status: 'unreachable',
  },
  {
    id: 'AR17-TAG-04', ar: 'AR-17', file: 'netlify/functions/_shared/tag-learning.ts', rule: 'callee:applyMemoryToNeedsReviewStaging',
    ownerTeam: 'Tag HQ',
    reason: 'Retroactive staging apply after a learned correction; nothing reports it as done (learned = memory saved only).',
    removalPlan: 'Plan item 7: await with a timeout (or outbox after its GO).',
    added: '2026-11-25', expires: '2027-01-24', renewals: 0,
  },
  {
    id: 'AR17-TAG-05', ar: 'AR-17', file: 'netlify/functions/tag-learn.ts', rule: 'callee:logUserEvent',
    ownerTeam: 'Tag HQ',
    reason: 'AI-fluency analytics after a correction; no reply, receipt or status depends on it.',
    removalPlan: 'Plan item 7: await with a short timeout (or classify as telemetry-exempt by owner decision).',
    added: '2026-11-25', expires: '2027-01-24', renewals: 0,
  },
  {
    id: 'AR17-TAG-06', ar: 'AR-17', file: 'netlify/functions/tag-learn.ts', rule: 'callee:recalcFluency',
    ownerTeam: 'Tag HQ',
    reason: 'AI-fluency analytics after a correction; no reply, receipt or status depends on it.',
    removalPlan: 'Plan item 7: await with a short timeout (or classify as telemetry-exempt by owner decision).',
    added: '2026-11-25', expires: '2027-01-24', renewals: 0,
  },
];

export const exceptionsFor = (ar: ArchException['ar']) => ARCH_EXCEPTIONS.filter(e => e.ar === ar);
