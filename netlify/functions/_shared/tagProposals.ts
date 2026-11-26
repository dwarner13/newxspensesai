/**
 * T-ACT-SAFE — Tag's AI-initiated changes as server proposals (owner GO 2026-11-25, Tag HQ).
 *
 * Merchant rules, bulk category moves and merchant renames used to be executed by Tag's chat model
 * directly, guarded only by prompt instructions. They now follow the SAME architecture as the
 * single-transaction change (T-H1b / T-LIVE-02): the tool call only PROPOSES; the server composes the
 * exact action with the verified affected count and stores it with a signed 'proposed' receipt; the
 * customer's explicit "yes" (tag-action commit_proposal) binds to that immediately preceding proposal,
 * re-checks the scope (stale → nothing changes) and executes owner-scoped writes.
 *
 * Owner requirements honoured here:
 *  - exact action + affected count before confirmation; future rules distinguished from changes to
 *    existing transactions; a rule NEVER touches existing transactions unless that was proposed;
 *  - protected classifications (PROTECTED_SOURCES: verified customer edits AND protected-but-unverified
 *    labels, plus NULL/unknown real categories) are never moved — and never described as customer-approved;
 *  - stale scope (different rows / count than proposed) is rejected;
 *  - renames change merchant_name only; the imported `merchant` and `description` are kept;
 *  - every read and write is scoped to the verified user.
 * No merchant names or amounts are logged here.
 */
import { createHash } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { pagedSelectAll, type PagedQuery } from '../../../src/shared/paged-select';
import { PROTECTED_SOURCES } from '../../../src/shared/tag-status';
import { resolveCategoryRequest, TAG_CATEGORIES } from './tagCategories.js';
import { computeImportSuggestions } from './tagImportSuggestions.js';
import { AUTO_UPDATE_SOURCE_FILTER, AUTO_UPDATE_CATEGORY_FILTER } from './categorySource.js';

export const TAG_RULE_ACTION = 'save_merchant_rule';
export const TAG_BULK_ACTION = 'bulk_move_category';
export const TAG_RENAME_ACTION = 'rename_merchant';
/** Owner GO 2026-11-25: "Apply suggestions" after an import is a confirmed bulk change. */
export const TAG_SUGGESTIONS_ACTION = 'apply_import_suggestions';
export const TAG_PROPOSAL_ACTIONS: ReadonlyArray<string> = [TAG_RULE_ACTION, TAG_BULK_ACTION, TAG_RENAME_ACTION, TAG_SUGGESTIONS_ACTION];

/** Tool name (tag-copilot) → action name (receipt). */
export const TOOL_TO_ACTION: Readonly<Record<string, string>> = {
  set_category_rule: TAG_RULE_ACTION,
  bulk_recategorize: TAG_BULK_ACTION,
  rename_merchant: TAG_RENAME_ACTION,
};

export type ProposalSubject = Record<string, string | number | null>;

export type ActionProposalOutcome =
  | { state: 'proposed'; action: string; subject: ProposalSubject; reply: string; /** Rows matching the scope (before protection / no-op filtering). */ matched?: number }
  | { state: 'failed'; action: string; reason: string; reply: string };

/**
 * One Tag activity record in the LIVE tag_activity_log columns (AR-SCHEMA, 2026-11-26; agreed with
 * Prime HQ, whose tag_status reads change_source). change_source = the stable action name.
 * The old action_type / old_value / new_value / note keys never existed live, so no row was stored.
 */
export type TagActivityEntry = {
  change_source: string;
  change_note: string;
  merchant_name: string | null;
  previous_category: string | null;
  new_category: string | null;
  new_subcategory?: string | null;
  transaction_id?: string | null;
};

/** The exact live columns a Tag activity row may contain (anything else is dropped). */
export function toActivityRow(userId: string, e: TagActivityEntry): Record<string, unknown> {
  return {
    user_id: userId, change_source: e.change_source, change_note: e.change_note, merchant_name: e.merchant_name,
    previous_category: e.previous_category, new_category: e.new_category,
    ...(e.new_subcategory !== undefined ? { new_subcategory: e.new_subcategory } : {}),
    ...(e.transaction_id !== undefined ? { transaction_id: e.transaction_id } : {}),
    created_at: new Date().toISOString(),
  };
}

export type ActionExecutionOutcome = {
  state: 'completed' | 'failed';
  action: string;
  reason?: string;
  count: number;
  reply: string;
  /** For the activity log (no amounts). LIVE tag_activity_log columns only (AR-SCHEMA 2026-11-26). */
  log?: TagActivityEntry;
};

const PROTECTED = new Set<string>(PROTECTED_SOURCES);
const isProtected = (source: unknown) => PROTECTED.has(String(source ?? '').trim().toLowerCase());
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const escLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
const catLabel = (c: string | null, sub: string | null) => (sub ? `${c} / ${sub}` : String(c));

/** Fingerprint of the exact rows a proposal covers (stale-scope detection). */
export function scopeFingerprint(ids: ReadonlyArray<string>): string {
  if (ids.length === 0) return 'none';
  return createHash('sha256').update([...ids].sort().join(',')).digest('hex').slice(0, 16);
}

interface ScopeRow { id: string; merchant_name?: string | null; category?: string | null; subcategory?: string | null; category_source?: string | null }
interface Scope { matched: number; eligible: string[]; kept: number; complete: boolean }

type Params =
  | { action: typeof TAG_RULE_ACTION; merchantPattern: string; targetCategory: string; targetSubcategory: string | null; applyToExisting: boolean; exact?: boolean }
  | { action: typeof TAG_BULK_ACTION; fromCategory: string; toCategory: string }
  | { action: typeof TAG_RENAME_ACTION; fromName: string; toName: string };

/** Every row in the action's scope, owner-scoped and paged past the API row cap. */
async function readScope(sb: SupabaseClient, userId: string, p: Params): Promise<Scope> {
  const res = await pagedSelectAll<ScopeRow>(() => {
    let q = sb.from('transactions').select('id, merchant_name, category, subcategory, category_source').eq('user_id', userId);
    if (p.action === TAG_RULE_ACTION) q = q.ilike('merchant_name', p.exact ? escLike(p.merchantPattern) : `%${escLike(p.merchantPattern)}%`);
    else if (p.action === TAG_BULK_ACTION) q = q.eq('category', p.fromCategory);
    else q = q.ilike('merchant_name', escLike(p.fromName));
    return q.order('id', { ascending: true }) as unknown as PagedQuery;
  });
  if (res.error || !res.complete) return { matched: res.rowsFetched, eligible: [], kept: 0, complete: false };
  const rows = res.rows;
  let kept = 0;
  const eligible: string[] = [];
  for (const r of rows) {
    if (p.action === TAG_RENAME_ACTION) {
      // A rename changes the display name only (never a category): every matching row is in scope.
      if ((r.merchant_name ?? '') !== p.toName) eligible.push(String(r.id));
      continue;
    }
    if (isProtected(r.category_source)) { kept++; continue; }
    if (p.action === TAG_RULE_ACTION) {
      const same = (r.category ?? null) === p.targetCategory && (p.targetSubcategory === null || (r.subcategory ?? null) === p.targetSubcategory);
      if (!same) eligible.push(String(r.id));
    } else {
      eligible.push(String(r.id));
    }
  }
  return { matched: rows.length, eligible, kept, complete: true };
}

function paramsFromSubject(action: string, s: ProposalSubject): Params | null {
  if (action === TAG_RULE_ACTION && typeof s.merchantPattern === 'string' && typeof s.targetCategory === 'string') {
    return { action, merchantPattern: s.merchantPattern, targetCategory: s.targetCategory, targetSubcategory: typeof s.targetSubcategory === 'string' ? s.targetSubcategory : null, applyToExisting: s.applyToExisting === 'yes', exact: s.matchType === 'exact' };
  }
  if (action === TAG_BULK_ACTION && typeof s.fromCategory === 'string' && typeof s.toCategory === 'string') {
    return { action, fromCategory: s.fromCategory, toCategory: s.toCategory };
  }
  if (action === TAG_RENAME_ACTION && typeof s.fromName === 'string' && typeof s.toName === 'string') {
    return { action, fromName: s.fromName, toName: s.toName };
  }
  return null;
}

const failed = (action: string, reason: string, reply: string): ActionProposalOutcome => ({ state: 'failed', action, reason, reply });
const INCOMPLETE = "I couldn't read all of the affected transactions just now, so I haven't proposed anything. Please try again in a moment.";

function categoryProblem(res: ReturnType<typeof resolveCategoryRequest>): string | null {
  if (res.status === 'ambiguous') return `"${res.requested}" could mean ${res.candidates.map(c => `**${c}**`).join(' or ')}. Which one should I use?`;
  if (res.status === 'unknown') return `I don't have a "${res.requested}" category. Which of these fits best: ${TAG_CATEGORIES.filter(c => c !== 'Income' && c !== 'Transfers').join(', ')}?`;
  return null;
}

/**
 * Build Tag's proposal for one of the three actions from the model's tool input. Read-only: no
 * transaction, rule or memory is written here.
 */
export async function buildActionProposal(
  sb: SupabaseClient,
  userId: string,
  tool: string,
  input: Record<string, unknown>,
): Promise<ActionProposalOutcome> {
  const action = TOOL_TO_ACTION[tool];
  if (!action) return failed('unknown', 'unknown_tool', "I can't do that one, so nothing has changed.");
  try {
    if (action === TAG_RULE_ACTION) {
      const vendor = String(input.vendor ?? '').trim().slice(0, 80);
      if (vendor.length < 2) return failed(action, 'missing_merchant', 'Which merchant should the rule be for?');
      const res = resolveCategoryRequest(`${String(input.category ?? '').trim()}${input.subcategory ? ` > ${String(input.subcategory).trim()}` : ''}`);
      const problem = categoryProblem(res);
      if (problem || (res.status !== 'exact' && res.status !== 'closest')) return failed(action, 'category_unresolved', problem || 'Which category should I use?');
      const merchantPattern = vendor.toUpperCase();
      // Keep an existing rule's subcategory when none was named (never silently drop it).
      let targetSubcategory = res.subcategory;
      if (!targetSubcategory) {
        const { data: existing } = await sb.from('category_rules').select('category, subcategory')
          .eq('user_id', userId).eq('merchant_pattern', merchantPattern).limit(1).maybeSingle();
        if (existing?.subcategory && existing.category === res.category) targetSubcategory = String(existing.subcategory);
      }
      const applyToExisting = input.applyToExisting === true;
      // 'exact' only when a caller passes an exact merchant name (e.g. a suggestion chip); default contains.
      const exact = input.matchType === 'exact';
      const p: Params = { action: TAG_RULE_ACTION, merchantPattern, targetCategory: res.category, targetSubcategory, applyToExisting, exact };
      const scope = await readScope(sb, userId, p);
      if (!scope.complete) return failed(action, 'scope_incomplete', INCOMPLETE);
      const target = catLabel(res.category, targetSubcategory);
      const note = res.status === 'closest' ? `There's no "${res.requested}" category — the closest is **${res.category}**.\n\n` : '';
      const keptLine = scope.kept > 0 ? ` (${plural(scope.kept, 'transaction')} with a protected category (set by you, or of unverified origin) will stay as they are)` : '';
      const reply = applyToExisting
        ? `${note}Save a rule so **future imports** matching "${vendor}" are categorized as **${target}**, AND change **${scope.eligible.length}** of your **existing** "${vendor}" ${scope.eligible.length === 1 ? 'transaction' : 'transactions'} to **${target}** now${keptLine}? Say yes to confirm.`
        : `${note}Save a rule so **future imports** matching "${vendor}" are categorized as **${target}**? This does **not** change your ${plural(scope.matched, 'existing transaction')} matching "${vendor}" — tell me if you want those changed too. Say yes to confirm.`;
      return {
        state: 'proposed', action, reply, matched: scope.matched,
        subject: {
          merchantPattern, targetCategory: res.category, targetSubcategory, applyToExisting: applyToExisting ? 'yes' : 'no', matchType: exact ? 'exact' : 'contains',
          affected: applyToExisting ? scope.eligible.length : 0,
          fingerprint: applyToExisting ? scopeFingerprint(scope.eligible) : 'rule_only',
        },
      };
    }

    if (action === TAG_BULK_ACTION) {
      const from = resolveCategoryRequest(String(input.from_category ?? ''));
      const to = resolveCategoryRequest(String(input.to_category ?? ''));
      if (from.status !== 'exact') return failed(action, 'category_unresolved', 'Which category should I move transactions out of? Please use the category name exactly as it appears.');
      const problem = categoryProblem(to);
      if (problem || (to.status !== 'exact' && to.status !== 'closest')) return failed(action, 'category_unresolved', problem || 'Which category should they move to?');
      if (from.category === to.category) return failed(action, 'same_category', `Those are both **${from.category}**, so there's nothing to move.`);
      const p: Params = { action: TAG_BULK_ACTION, fromCategory: from.category, toCategory: to.category };
      const scope = await readScope(sb, userId, p);
      if (!scope.complete) return failed(action, 'scope_incomplete', INCOMPLETE);
      if (scope.eligible.length === 0) {
        return failed(action, 'nothing_to_move', scope.kept > 0
          ? `All ${plural(scope.kept, 'transaction')} in **${from.category}** have a protected category (set by you, or of unverified origin), so I'll leave them as they are.`
          : `There are no transactions in **${from.category}** to move.`);
      }
      const note = to.status === 'closest' ? `There's no "${to.requested}" category — the closest is **${to.category}**.\n\n` : '';
      const keptLine = scope.kept > 0 ? ` ${plural(scope.kept, 'transaction')} in ${from.category} with a protected category (set by you, or of unverified origin) will stay as they are.` : '';
      return {
        state: 'proposed', action,
        reply: `${note}Move **${scope.eligible.length}** existing ${scope.eligible.length === 1 ? 'transaction' : 'transactions'} from **${from.category}** to **${to.category}**?${keptLine} This changes existing transactions only — no rule is saved for future imports. Say yes to confirm.`,
        subject: { fromCategory: from.category, toCategory: to.category, affected: scope.eligible.length, fingerprint: scopeFingerprint(scope.eligible) },
      };
    }

    // rename
    const fromName = String(input.from_name ?? '').trim().slice(0, 120);
    const toName = String(input.to_name ?? '').trim().slice(0, 120);
    if (!fromName || !toName) return failed(action, 'missing_name', 'Which merchant name should I change, and to what?');
    if (fromName === toName) return failed(action, 'same_name', "That's already the name, so there's nothing to change.");
    const p: Params = { action: TAG_RENAME_ACTION, fromName, toName };
    const scope = await readScope(sb, userId, p);
    if (!scope.complete) return failed(action, 'scope_incomplete', INCOMPLETE);
    if (scope.eligible.length === 0) return failed(action, 'nothing_to_rename', `I didn't find any transactions named exactly "${fromName}", so nothing has changed.`);
    return {
      state: 'proposed', action,
      reply: `Rename **${scope.eligible.length}** ${scope.eligible.length === 1 ? 'transaction' : 'transactions'} from "${fromName}" to "${toName}"? Only the displayed merchant name changes — the original imported description is kept for your records, and categories and rules are not changed. Say yes to confirm.`,
      subject: { fromName, toName, affected: scope.eligible.length, fingerprint: scopeFingerprint(scope.eligible) },
    };
  } catch {
    return failed(action, 'preview_error', 'Something went wrong checking your transactions, so nothing has changed. Try again?');
  }
}

const suggestionFingerprint = (groups: Array<{ ids: string[]; category: string; subcategory: string | null }>) =>
  scopeFingerprint(groups.flatMap(g => g.ids.map(id => `${id}:${g.category}:${g.subcategory ?? ''}`)));

/**
 * "Apply Tag's suggestions" for one import as a signed proposal: the server computes the suggestions
 * itself (never the browser's id / category list), states the exact count, and fingerprints every
 * id + target category so the confirmation re-checks the exact same change.
 */
export async function buildImportSuggestionsProposal(sb: SupabaseClient, userId: string, importId: string): Promise<ActionProposalOutcome> {
  const action = TAG_SUGGESTIONS_ACTION;
  try {
    const sug = await computeImportSuggestions(sb, userId, importId);
    if (!sug.complete) return failed(action, 'scope_incomplete', INCOMPLETE);
    const affected = sug.groups.reduce((n, g) => n + g.count, 0);
    if (affected === 0) return failed(action, 'nothing_to_apply', "There are no suggestions to apply for this statement, so nothing has changed.");
    const kept = sug.skippedProtected > 0 ? ` ${plural(sug.skippedProtected, 'transaction')} with a protected category (set by you, or of unverified origin) will stay as they are.` : '';
    const top = sug.groups.slice(0, 3).map(g => `${g.merchant_name} → ${catLabel(g.category, g.subcategory)} (${g.count})`).join('; ');
    return {
      state: 'proposed', action, matched: affected,
      reply: `Apply Tag's suggestions to **${affected}** ${affected === 1 ? 'transaction' : 'transactions'} from this statement (${plural(sug.groups.length, 'merchant')}: ${top}${sug.groups.length > 3 ? '; …' : ''})?${kept} No rules are saved. Say yes to confirm.`,
      subject: { importId, affected, groups: sug.groups.length, fingerprint: suggestionFingerprint(sug.groups) },
    };
  } catch {
    return failed(action, 'preview_error', 'Something went wrong checking your transactions, so nothing has changed. Try again?');
  }
}

/** Same subject (every key and value), e.g. the client's echo vs the signed proposal. */
export function sameProposalSubject(a: ProposalSubject | undefined, b: ProposalSubject | undefined): boolean {
  if (!a || !b) return false;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if ((a[k] ?? null) !== (b[k] ?? null)) return false;
  return true;
}

const CHUNK = 200;

async function updateIds(
  sb: SupabaseClient, userId: string, ids: string[], payload: Record<string, unknown>, opts: { gapOnly?: boolean; renameOnly?: boolean } = {},
): Promise<{ count: number; error: boolean }> {
  let count = 0;
  for (let i = 0; i < ids.length; i += CHUNK) {
    // A row that became protected after the proposal is never overwritten (re-checked here).
    let q = sb.from('transactions').update(payload).in('id', ids.slice(i, i + CHUNK)).eq('user_id', userId);
    // A rename never changes a category, so a protected category is no reason to skip it.
    if (!opts.renameOnly) q = q.or(AUTO_UPDATE_SOURCE_FILTER);
    if (opts.gapOnly) q = q.or(AUTO_UPDATE_CATEGORY_FILTER);
    const { data, error } = await q.select('id');
    if (error) return { count, error: true };
    count += Array.isArray(data) ? data.length : 0;
  }
  return { count, error: false };
}

/**
 * Execute a proposal the customer confirmed. `subject` MUST be the server-signed proposal's subject
 * (the caller verified the binding). The scope is re-read: if the rows differ from what was proposed,
 * nothing changes (stale).
 */
export async function executeActionProposal(
  sb: SupabaseClient,
  userId: string,
  action: string,
  subject: ProposalSubject,
): Promise<ActionExecutionOutcome> {
  const now = new Date().toISOString();
  if (action === TAG_SUGGESTIONS_ACTION) {
    const importId = typeof subject.importId === 'string' ? subject.importId : '';
    if (!importId) return { state: 'failed', action, reason: 'invalid_proposal', count: 0, reply: "I couldn't read that proposal, so nothing has changed." };
    try {
      const sug = await computeImportSuggestions(sb, userId, importId);
      const affected = sug.groups.reduce((n, g) => n + g.count, 0);
      if (!sug.complete) return { state: 'failed', action, reason: 'scope_incomplete', count: 0, reply: INCOMPLETE.replace("haven't proposed anything", "haven't changed anything") };
      if (affected !== Number(subject.affected) || suggestionFingerprint(sug.groups) !== subject.fingerprint) {
        return { state: 'failed', action, reason: 'stale', count: 0, reply: `Your transactions changed since I proposed this (it would now affect ${plural(affected, 'transaction')}, not ${subject.affected}), so I didn't change anything. Want me to check it again?` };
      }
      let count = 0;
      for (const g of sug.groups) {
        const payload: Record<string, unknown> = { category: g.category, category_source: 'tag_chat', updated_at: now };
        if (g.subcategory) { payload.subcategory = g.subcategory; payload.subcategory_source = 'tag_chat'; }
        const r = await updateIds(sb, userId, g.ids, payload, { gapOnly: true });
        count += r.count;
        if (r.error) {
          return { state: 'failed', action, reason: count ? 'partial' : 'update_failed', count, reply: count ? `I applied ${count} of ${affected} before an error stopped me. Please check your transactions before trying again.` : "I couldn't apply those suggestions, so nothing was changed." };
        }
      }
      return {
        state: 'completed', action, count,
        reply: count === affected
          ? `Done — applied Tag's suggestions to **${count}** ${count === 1 ? 'transaction' : 'transactions'}. No rules were saved.`
          : `Applied Tag's suggestions to **${count}** of ${affected} transactions; the rest changed in the meantime and were left as they are.`,
        log: { change_source: TAG_SUGGESTIONS_ACTION, merchant_name: null, previous_category: null, new_category: null, change_note: `Applied ${count} import suggestions (customer confirmed)` },
      };
    } catch {
      return { state: 'failed', action, reason: 'commit_error', count: 0, reply: "I couldn't make that change, so nothing was changed. Please try again." };
    }
  }
  const p = paramsFromSubject(action, subject);
  if (!p) return { state: 'failed', action, reason: 'invalid_proposal', count: 0, reply: "I couldn't read that proposal, so nothing has changed." };
  try {
    const needsRows = !(p.action === TAG_RULE_ACTION && !p.applyToExisting);
    let ids: string[] = [];
    if (needsRows) {
      const scope = await readScope(sb, userId, p);
      if (!scope.complete) return { state: 'failed', action, reason: 'scope_incomplete', count: 0, reply: INCOMPLETE.replace("haven't proposed anything", "haven't changed anything") };
      if (scope.eligible.length !== Number(subject.affected) || scopeFingerprint(scope.eligible) !== subject.fingerprint) {
        return {
          state: 'failed', action, reason: 'stale', count: 0,
          reply: `Your transactions changed since I proposed this (it would now affect ${plural(scope.eligible.length, 'transaction')}, not ${subject.affected}), so I didn't change anything. Want me to check it again?`,
        };
      }
      ids = scope.eligible;
    }

    if (p.action === TAG_BULK_ACTION) {
      const r = await updateIds(sb, userId, ids, { category: p.toCategory, category_source: 'tag_chat', updated_at: now });
      if (r.error) return { state: 'failed', action, reason: r.count ? 'partial' : 'update_failed', count: r.count, reply: r.count ? `I moved ${r.count} of ${ids.length} before an error stopped me. Please check your transactions before trying again.` : "I couldn't move those transactions, so nothing was changed." };
      return {
        state: 'completed', action, count: r.count,
        reply: `Done — moved **${r.count}** ${r.count === 1 ? 'transaction' : 'transactions'} from **${p.fromCategory}** to **${p.toCategory}**. No rule was saved.`,
        log: { change_source: 'bulk_move_category', merchant_name: null, previous_category: p.fromCategory, new_category: p.toCategory, change_note: `Moved ${r.count} transactions (customer confirmed)` },
      };
    }

    if (p.action === TAG_RENAME_ACTION) {
      // merchant_name only: the imported `merchant` and `description` stay as the audit trail.
      const r = await updateIds(sb, userId, ids, { merchant_name: p.toName, updated_at: now }, { renameOnly: true });
      if (r.error) return { state: 'failed', action, reason: r.count ? 'partial' : 'update_failed', count: r.count, reply: r.count ? `I renamed ${r.count} of ${ids.length} before an error stopped me. Please check your transactions before trying again.` : "I couldn't rename those transactions, so nothing was changed." };
      return {
        state: 'completed', action, count: r.count,
        reply: `Done — renamed **${r.count}** ${r.count === 1 ? 'transaction' : 'transactions'} from "${p.fromName}" to "${p.toName}". The original imported descriptions are unchanged.`,
        log: { change_source: 'rename_merchant', merchant_name: p.fromName, previous_category: null, new_category: null, change_note: `Renamed ${r.count} transactions to "${p.toName}" (customer confirmed; original descriptions kept)` },
      };
    }

    // Rule (and, only when proposed, the existing transactions).
    let moved = 0;
    if (p.applyToExisting && ids.length > 0) {
      const payload: Record<string, unknown> = { category: p.targetCategory, category_source: 'tag_rule', updated_at: now };
      if (p.targetSubcategory) { payload.subcategory = p.targetSubcategory; payload.subcategory_source = 'tag_rule'; }
      const r = await updateIds(sb, userId, ids, payload);
      moved = r.count;
      if (r.error) return { state: 'failed', action, reason: moved ? 'partial' : 'update_failed', count: moved, reply: moved ? `I changed ${moved} of ${ids.length} existing transactions before an error stopped me, and the rule was not saved. Please check before trying again.` : "I couldn't change those transactions, so nothing was changed and the rule was not saved." };
    }
    const vendorKey = p.merchantPattern.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    const { error: ruleErr } = await sb.from('category_rules').upsert({
      user_id: userId, match_type: p.exact ? 'exact' : 'contains', merchant_pattern: p.merchantPattern, match_value: p.merchantPattern,
      category: p.targetCategory, ...(p.targetSubcategory ? { subcategory: p.targetSubcategory } : {}), is_active: true, updated_at: now,
    }, { onConflict: 'user_id,merchant_pattern' });
    const { error: memErr } = await sb.from('vendor_category_memory').upsert({
      user_id: userId, vendor_key: vendorKey, category: p.targetCategory, ...(p.targetSubcategory ? { subcategory: p.targetSubcategory } : {}), updated_at: now,
    }, { onConflict: 'user_id,vendor_key' });
    if (memErr) console.error('[tagProposals] vendor memory upsert failed');
    const { data: verify } = await sb.from('category_rules').select('category').eq('user_id', userId).eq('merchant_pattern', p.merchantPattern).limit(1).maybeSingle();
    const target = catLabel(p.targetCategory, p.targetSubcategory);
    if (ruleErr || !verify || verify.category !== p.targetCategory) {
      return {
        state: 'failed', action, reason: 'rule_not_saved', count: moved,
        reply: moved ? `I changed ${moved} existing transactions, but I couldn't save the rule, so future imports won't be categorized automatically yet.` : "I couldn't save that rule, so nothing was changed.",
      };
    }
    return {
      state: 'completed', action, count: moved,
      reply: p.applyToExisting
        ? `Done — saved the rule for future "${p.merchantPattern}" imports (**${target}**) and changed **${moved}** existing ${moved === 1 ? 'transaction' : 'transactions'}.`
        : `Done — saved the rule for future "${p.merchantPattern}" imports (**${target}**). Your existing transactions were not changed.`,
      log: { change_source: 'save_merchant_rule', merchant_name: p.merchantPattern, previous_category: null, new_category: p.targetCategory, new_subcategory: p.targetSubcategory ?? null, change_note: `Rule saved (customer confirmed); existing transactions changed: ${moved}` },
    };
  } catch {
    return { state: 'failed', action, reason: 'commit_error', count: 0, reply: "I couldn't make that change, so nothing was changed. Please try again." };
  }
}
