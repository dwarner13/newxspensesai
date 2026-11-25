/**
 * tag-action - Natural language category change handler for Tag chat.
 *
 * Intents:
 *   preview                  -> find matching transactions, return count + samples (no writes)
 *   commit                   -> update transactions + create rule + write vendor memory
 *   save_rule                -> upsert a category rule + backfill existing transactions
 *   undo                     -> revert categories on specific IDs
 *   bulk_apply               -> apply multiple category groups (background sweep)
 *   fix_type                 -> flip income/expense on a single transaction
 *   fix_type_bulk            -> flip income/expense on many transactions by merchant or category
 *   bulk_normalize_subcategory -> sweep transactions and assign canonical subcategories by merchant keyword
 */

import type { Handler } from '@netlify/functions';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { safeLog } from './_shared/safeLog.js';
import {
  resolveEmployeeConversation,
  findLatestActionReceipt,
  claimConversationTurn,
  completeConversationTurn,
  parseActionReceipt,
  type ActionReceipt,
} from './_shared/conversation-platform.js';
import { resolveCategoryRequest } from './_shared/tagCategories.js';
import { TAG_SINGLE_ACTION, UUID_RE, loadOwnedTransaction, buildSingleProposal, catLabel } from './_shared/tagSingleTransaction.js';
import { TAG_PROPOSAL_ACTIONS, TAG_RULE_ACTION, TAG_SUGGESTIONS_ACTION, sameProposalSubject, executeActionProposal, buildActionProposal, buildImportSuggestionsProposal, type ProposalSubject } from './_shared/tagProposals.js';
import { isAutoWritable, AUTO_UPDATE_CATEGORY_FILTER, AUTO_UPDATE_SOURCE_FILTER } from './_shared/categorySource.js';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

function ok(body: object, status = 200) {
  return { statusCode: status, headers: CORS, body: JSON.stringify(body) };
}
function err(message: string, status = 400) {
  return { statusCode: status, headers: CORS, body: JSON.stringify({ ok: false, error: message }) };
}

function parseCategoryInput(raw: string): { category: string; subcategory: string | null } {
  const value = String(raw || '').trim();
  if (!value) return { category: 'Other', subcategory: null };
  const separators = ['>', '::', '/'];
  for (const separator of separators) {
    const idx = value.indexOf(separator);
    if (idx !== -1) {
      const category = value.slice(0, idx).trim() || 'Other';
      const subcategory = value.slice(idx + separator.length).trim() || null;
      return { category, subcategory };
    }
  }
  return { category: value, subcategory: null };
}


const CANONICAL_CATEGORIES = [
  'Income',
  'Groceries',
  'Food & Dining',
  'Transportation',
  'Housing',
  'Utilities',
  'Shopping',
  'Subscriptions',
  'Entertainment',
  'Healthcare',
  'Insurance',
  'Education',
  'Travel',
  'Transfers',
  'Bank Fees',
  'Business',
  'Personal Care',
  'Home & Garden',
  'Rent or Lease',
  'Debt Payments',
  'Advertising',
  'Technology',
  'Other',
  'Uncategorized',
] as const;

const CATEGORY_ALIASES: Record<string, string> = {
  dining: 'Food & Dining',
  'food and dining': 'Food & Dining',
  health: 'Healthcare',
  fees: 'Bank Fees',
  'cash & atm': 'Transfers',
  'health & fitness': 'Personal Care',
  vehicle: 'Transportation',
  automotive: 'Transportation',
  rent: 'Rent or Lease',
  mortgage: 'Rent or Lease',
  software: 'Subscriptions',
};

function normalizeCategoryKey(input: string): string {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}
function normalizeCanonicalCategory(input: string): string {
  const key = normalizeCategoryKey(input);
  if (!key) return 'Other';
  const direct = CANONICAL_CATEGORIES.find((c) => normalizeCategoryKey(c) === key);
  if (direct) return direct;
  return CATEGORY_ALIASES[key] || 'Other';
}

/* Merchant keyword → subcategory rules were used only by the retired bulk_normalize_subcategory
   intent (owner GO 2026-11-25) and were removed with it. */

// ── Intent classifier ──────────────────────────────────────────────────────
export function classifyTagIntent(message: string): {
  matchValue: string;
  targetCategory: string;
  matchType: 'contains' | 'exact';
} | null {
  const text = message.toLowerCase().trim();

  const actionVerbs = /\b(move|change|set|mark|categorize|recategorize|put|tag|assign|update)\b/i;
  if (!actionVerbs.test(text)) return null;

  const toPattern = /(?:move|change|set|mark|categorize|recategorize|put|tag|assign|update)\s+(?:all\s+)?["']?([^"']+?)["']?\s+(?:to|as)\s+["']?([^"'.,!?]+)["']?/i;
  const match = text.match(toPattern);
  if (!match) return null;

  const matchValue = match[1].trim();
  const targetCategory = match[2].trim();

  if (!matchValue || !targetCategory) return null;

  const isQuoted = /["']/.test(message.slice(message.toLowerCase().indexOf(matchValue) - 1, message.toLowerCase().indexOf(matchValue)));

  return {
    matchValue,
    targetCategory: targetCategory.charAt(0).toUpperCase() + targetCategory.slice(1),
    matchType: isQuoted ? 'exact' : 'contains',
  };
}

// ── Shared cores for PREVIEW and COMMIT (used by the legacy and conversational paths) ─────────
// Same client type the shared conversation platform uses.
type TagSupabase = SupabaseClient;
type PreviewRow = { id: string; merchant_name: string | null; amount: number | null; posted_at: string | null; category: string | null };

/** Owner-scoped merchant match over the customer's recent transactions (read only). */
async function runPreview(
  supabase: TagSupabase, userId: string,
  opts: { normalized: string; matchType: string; importId?: string | null },
): Promise<PreviewRow[]> {
  let query = supabase
    .from('transactions')
    .select('id, merchant_name, amount, posted_at, category')
    .eq('user_id', userId)
    .order('posted_at', { ascending: false })
    .limit(500);
  if (opts.importId) query = query.eq('import_id', opts.importId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data || []) as PreviewRow[];
  return rows.filter((tx) => {
    const haystack = (tx.merchant_name || '').toUpperCase();
    return opts.matchType === 'exact' ? haystack === opts.normalized : haystack.includes(opts.normalized);
  });
}


// ── T-H1b: conversational preview / confirmation / cancellation with SERVER receipts ─────────
// The browser sends `conversation: { sessionId?, clientMessageId, customerText, newConversation? }`.
// Tag's replies and receipts are composed here from verified results; browser text is never stored
// as Tag's words. A confirmation is honoured only for the proposal the server recorded as the
// immediately preceding Tag reply. Claim-first: the customer message is stored before anything runs,
// and a duplicate (retry / concurrent / partial failure) never runs the action again.
const TAG_ACTION = 'recategorize_by_merchant';
// T-LIVE-02: single-transaction proposal / ownership helpers live in _shared/tagSingleTransaction.ts
// (shared with tag-copilot's update_single_transaction tool).

interface ConversationFields {
  sessionId: string | null;
  clientMessageId: string | null;
  customerText: string;
  newConversation: boolean;
}

function parseConversationFields(raw: unknown): ConversationFields | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const customerText = typeof r.customerText === 'string' ? r.customerText.trim().slice(0, 4000) : '';
  if (!customerText) return null;
  return {
    sessionId: typeof r.sessionId === 'string' ? r.sessionId : null,
    clientMessageId: typeof r.clientMessageId === 'string' ? r.clientMessageId : null,
    customerText,
    newConversation: r.newConversation === true,
  };
}



type Subject = { matchValue: string; targetCategory: string; targetSubcategory: string | null; matchType: string };
const sameSubject = (a: ActionReceipt['subject'] | undefined, b: Subject) => !!a
  && a.matchValue === b.matchValue && a.targetCategory === b.targetCategory
  && (a.targetSubcategory ?? null) === b.targetSubcategory && a.matchType === b.matchType;

async function handleConversationalAction(
  supabase: TagSupabase,
  userId: string,
  intent: 'preview' | 'commit' | 'cancel_proposal' | 'preview_single' | 'commit_single' | 'commit_proposal' | 'propose_import_suggestions',
  convo: ConversationFields,
  ctx: {
    subject: Subject | null; importId?: string | null; affectedIds?: unknown; parsedTarget?: { category: string; subcategory: string | null };
    /** T-LIVE-02 single-transaction request (transactionId is re-verified server-side). */
    single?: { transactionId: string; targetPhrase?: string; targetCategory?: string; targetSubcategory?: string | null };
    /** T-ACT-SAFE: confirmation of a rule / bulk move / rename proposal Tag made (client echo). */
    generic?: { action: string; subject: ProposalSubject };
    /** T-ACT-FINAL: a customer-typed "change all X to Y" — proposed through the same tagProposals contract. */
    typed?: { matchValue: string; targetCategory: string; matchType: 'contains' | 'exact' };
    /** "Apply Tag's suggestions" for one import (server-computed; never the browser's id list). */
    suggestions?: { importId: string };
  },
) {
  const isSingle = intent === 'preview_single' || intent === 'commit_single';
  const isGeneric = intent === 'commit_proposal';
  const actionName = isSingle ? TAG_SINGLE_ACTION
    : isGeneric && ctx.generic ? ctx.generic.action
      : intent === 'preview' && ctx.typed ? TAG_RULE_ACTION
        : intent === 'propose_import_suggestions' ? TAG_SUGGESTIONS_ACTION
          : TAG_ACTION;
  // 1. The customer's own Tag conversation.
  let sessionId: string | null = null;
  try {
    sessionId = (await resolveEmployeeConversation(supabase, {
      userId, employeeSlug: 'tag-ai', requestedSessionId: convo.sessionId, newConversation: convo.newConversation,
    })).sessionId;
  } catch {
    sessionId = null;
    console.warn('[tag-action] conversation could not be opened; this turn will not be saved');
  }

  // 2. The proposal the server recorded as Tag's immediately preceding reply (read before the claim).
  let pending: { receipt: ActionReceipt; replyTo: string | null } | null = null;
  if (sessionId && intent !== 'preview') {
    try {
      const latest = await findLatestActionReceipt(supabase, { sessionId, userId, lookback: 1 });
      if (latest && latest.receipt.state === 'proposed'
        && (latest.receipt.action === TAG_ACTION || latest.receipt.action === TAG_SINGLE_ACTION
          || TAG_PROPOSAL_ACTIONS.includes(latest.receipt.action))) pending = latest;
    } catch { pending = null; }
  }
  const proposalMatches = !pending ? false
    : isGeneric
      // The confirmation binds only to Tag's immediately preceding signed proposal with the SAME action
      // and EVERY subject field (scope fingerprint included) — a tampered or different echo matches nothing.
      ? !!ctx.generic && pending.receipt.action === ctx.generic.action
        && sameProposalSubject(pending.receipt.subject, ctx.generic.subject)
    : isSingle
      // A confirmation binds only to Tag's immediately preceding SINGLE proposal for this exact
      // transaction and category.
      ? pending.receipt.action === TAG_SINGLE_ACTION && !!ctx.single
        && pending.receipt.subject?.transactionId === ctx.single.transactionId
        && pending.receipt.subject?.targetCategory === (ctx.single.targetCategory ?? null)
        && (pending.receipt.subject?.targetSubcategory ?? null) === (ctx.single.targetSubcategory ?? null)
      : pending.receipt.action === TAG_ACTION && !!ctx.subject && sameSubject(pending.receipt.subject, ctx.subject);

  // 3. Claim-first: store the customer message (with its confirmed / cancelled intent) before acting.
  let claimed = false;
  if (sessionId) {
    const actionIntent = intent === 'commit' || intent === 'commit_single' || intent === 'commit_proposal'
      ? { action: actionName, state: 'confirmed', proposalRef: pending?.replyTo ?? null, matchesProposal: proposalMatches }
      : intent === 'cancel_proposal'
        ? { action: pending?.receipt.action ?? TAG_ACTION, state: 'cancelled', proposalRef: pending?.replyTo ?? null }
        : undefined;
    let claim: Awaited<ReturnType<typeof claimConversationTurn>> | null = null;
    try {
      claim = await claimConversationTurn(supabase, {
        sessionId, userId, employeeSlug: 'tag-ai', userText: convo.customerText, clientMessageId: convo.clientMessageId,
        ...(actionIntent ? { metadata: { actionIntent } } : {}),
      });
    } catch { claim = null; }
    if (claim?.status === 'duplicate') {
      // Already stored: report the STORED reply and outcome; never run the action again and never
      // say "done" when the outcome was not recorded.
      return ok({
        ok: true, intent, duplicate: true, executed: false,
        conversation: {
          sessionId,
          persisted: claim.reply !== null,
          reply: claim.reply ?? "I already received that message, but its outcome wasn't recorded. Nothing was run again — please check your transactions before trying again.",
          receipt: parseActionReceipt(claim.actionOutcome),
        },
      });
    }
    if (claim?.status === 'conflict') {
      // Unique conflict with nothing stored in this session: assume nothing, act on nothing.
      return ok({
        ok: false, intent, error: 'conflict', executed: false,
        conversation: {
          sessionId, persisted: false, conflict: true, receipt: null,
          reply: "I couldn't safely record that message, so I didn't change anything. Please send it again.",
        },
      });
    }
    claimed = claim?.status === 'claimed';
  }

  // 4. Run the action and compose Tag's reply + receipt from the VERIFIED outcome.
  const base = { v: 1 as const, employee: 'tag-ai' as const, action: actionName, ...(ctx.subject ? { subject: ctx.subject } : {}) };
  let receipt: ActionReceipt;
  let reply: string;
  let executed = false;
  let legacy: Record<string, unknown> = {};

  if (intent === 'preview_single' && ctx.single) {
    // T-LIVE-02: a proposal for ONE verified transaction. Nothing is changed here.
    const outcome = await buildSingleProposal(supabase, userId, ctx.single.transactionId, ctx.single.targetPhrase || '');
    reply = outcome.reply;
    if (outcome.state === 'proposed') {
      receipt = { ...base, subject: outcome.subject, state: 'proposed', result: { matchCount: 1 } };
      legacy = { ok: true, transactionId: outcome.subject.transactionId, targetCategory: outcome.subject.targetCategory, targetSubcategory: outcome.subject.targetSubcategory, matchCount: 1, resolution: outcome.resolution };
    } else {
      receipt = { ...base, state: 'failed', reason: outcome.reason };
      legacy = { ok: false, error: outcome.reason === 'preview_error' ? 'preview_failed' : outcome.reason, ...(outcome.candidates ? { candidates: outcome.candidates } : {}) };
    }
  } else if (intent === 'commit_proposal' && ctx.generic) {
    // T-ACT-SAFE: execute a rule / bulk move / rename the customer explicitly confirmed. The SIGNED
    // proposal's subject (not the client's echo) drives execution; the scope is re-read and a stale
    // scope changes nothing.
    if (!sessionId || !proposalMatches || !pending) {
      legacy = { ok: false, error: 'no_matching_proposal' };
      receipt = { ...base, state: 'failed', reason: 'no_matching_proposal', proposalRef: pending?.replyTo ?? null };
      reply = "There's no pending change matching that confirmation, so I haven't changed anything. Tell me what you'd like to change and I'll check it first.";
    } else {
      const signedSubject = pending.receipt.subject as ProposalSubject;
      const outcome = await executeActionProposal(supabase, userId, pending.receipt.action, signedSubject);
      executed = outcome.state === 'completed';
      reply = outcome.reply;
      legacy = { ok: executed, action: outcome.action, updatedCount: outcome.count, ...(executed ? {} : { error: outcome.reason }) };
      receipt = {
        ...base, subject: signedSubject, state: outcome.state, proposalRef: pending.replyTo ?? null,
        result: { affectedCount: outcome.count }, ...(outcome.reason ? { reason: outcome.reason } : {}),
      };
      if (outcome.log) {
        await logTagActivity(supabase, { user_id: userId, ...outcome.log, created_at: new Date().toISOString() });
      }
      // Reliability round 2: the inbox / Prime briefing learn the SAVED result (the database-verified
      // count), never the suggestion count. Non-blocking: a failed notification never fails the change.
      if (executed && pending.receipt.action === TAG_SUGGESTIONS_ACTION && typeof signedSubject.importId === 'string') {
        try {
          const { error: nErr } = await supabase.from('user_notifications').insert({
            user_id: userId, employee_slug: 'tag-ai', type: 'tag_suggestions_applied',
            title: "Tag's suggestions applied",
            message: `You confirmed Tag's suggestions: ${outcome.count} transaction${outcome.count === 1 ? '' : 's'} saved.`,
            priority: 'normal',
            payload: { import_id: signedSubject.importId, applied_count: outcome.count, verified: true },
            sent_at: new Date().toISOString(),
          });
          if (nErr) console.warn('[tag-action] applied-suggestions notification not written');
        } catch {
          console.warn('[tag-action] applied-suggestions notification not written');
        }
      }
    }
  } else if (intent === 'commit_single' && ctx.single) {
    const subject = { transactionId: ctx.single.transactionId, targetCategory: ctx.single.targetCategory ?? null, targetSubcategory: ctx.single.targetSubcategory ?? null };
    if (!sessionId || !proposalMatches) {
      // Never act without a server-recorded, signed proposal for exactly this transaction and category.
      legacy = { ok: false, error: 'no_matching_proposal' };
      receipt = { ...base, subject, state: 'failed', reason: 'no_matching_proposal', proposalRef: pending?.replyTo ?? null };
      reply = "There's no pending change matching that confirmation, so I haven't changed anything. Tell me what you'd like to change and I'll check it first.";
    } else {
      try {
        const tx = await loadOwnedTransaction(supabase, userId, ctx.single.transactionId);
        if (!tx) {
          legacy = { ok: false, error: 'not_found' };
          receipt = { ...base, subject, state: 'failed', reason: 'not_found', proposalRef: pending?.replyTo ?? null, result: { affectedCount: 0 } };
          reply = "I can't find that transaction anymore, so nothing was changed.";
        } else {
          // Exactly one row, owner-scoped. No rule, no merchant memory, no other transaction.
          const { data: updated, error: upErr } = await supabase
            .from('transactions')
            .update({
              category: subject.targetCategory, subcategory: subject.targetSubcategory,
              category_source: 'tag_chat', updated_at: new Date().toISOString(),
            })
            .eq('id', tx.id)
            .eq('user_id', userId)
            .select('id');
          if (upErr) throw new Error('update_failed');
          const n = Array.isArray(updated) ? updated.length : 0;
          executed = n === 1;
          legacy = { ok: executed, transactionId: tx.id, targetCategory: subject.targetCategory, targetSubcategory: subject.targetSubcategory, updatedCount: n, ...(executed ? {} : { error: 'nothing_updated' }) };
          if (executed) {
            receipt = { ...base, subject, state: 'completed', proposalRef: pending?.replyTo ?? null, result: { affectedCount: 1 } };
            reply = `Done — this **${tx.merchant_name || ''}** transaction is now in **${catLabel(subject.targetCategory, subject.targetSubcategory)}**. No other transactions or rules were changed.`;
            // Completed-action record for authorized employee collaboration (Prime's tag_status reads
            // action_type only). Stable action_type = the receipt action name.
            await logTagActivity(supabase, {
              user_id: userId, action_type: TAG_SINGLE_ACTION, merchant_name: null, transaction_id: tx.id,
              old_value: tx.category ?? null, new_value: subject.targetCategory,
              note: 'Single transaction recategorized (customer confirmed)', created_at: new Date().toISOString(),
            });
          } else {
            receipt = { ...base, subject, state: 'failed', reason: 'nothing_updated', proposalRef: pending?.replyTo ?? null, result: { affectedCount: 0 } };
            reply = "I couldn't update that transaction, so nothing was changed. Please try again.";
          }
        }
      } catch {
        legacy = { ok: false, error: 'commit_failed' };
        receipt = { ...base, subject, state: 'failed', reason: 'commit_error', proposalRef: pending?.replyTo ?? null };
        reply = "I couldn't make that change, so nothing was changed. Please try again.";
      }
    }
  } else if (intent === 'propose_import_suggestions' && ctx.suggestions) {
    const outcome = await buildImportSuggestionsProposal(supabase, userId, ctx.suggestions.importId);
    reply = outcome.reply;
    if (outcome.state === 'proposed') {
      receipt = { ...base, subject: outcome.subject, state: 'proposed', result: { matchCount: Number(outcome.subject.affected ?? 0) } };
      legacy = { ok: true, matchCount: Number(outcome.subject.affected ?? 0), proposal: { kind: 'action', action: outcome.action, subject: outcome.subject } };
    } else {
      receipt = { ...base, state: 'failed', reason: outcome.reason };
      legacy = { ok: false, error: outcome.reason };
    }
  } else if (intent === 'preview' && ctx.typed) {
    // T-ACT-FINAL: "change all X to Y" typed by the customer is the SAME contract as Tag's own
    // proposals: verified scope (complete, owner-scoped), customer-confirmed rows kept, explicit
    // future-rule + existing-transactions wording, signed 'proposed' receipt, fingerprinted scope.
    const outcome = await buildActionProposal(supabase, userId, 'set_category_rule', {
      vendor: ctx.typed.matchValue, category: ctx.typed.targetCategory, applyToExisting: true, matchType: ctx.typed.matchType,
    });
    if (outcome.state === 'proposed' && (outcome.matched ?? 0) === 0) {
      legacy = { ok: true, matchValue: ctx.typed.matchValue.toUpperCase(), matchCount: 0 };
      receipt = { ...base, state: 'failed', reason: 'no_matches', result: { matchCount: 0 } };
      reply = `I searched your transactions but didn't find any matching "${ctx.typed.matchValue}". Want to try a different keyword, or tell me the merchant name you see in your list?`;
    } else if (outcome.state === 'proposed') {
      receipt = { ...base, subject: outcome.subject, state: 'proposed', result: { matchCount: Number(outcome.subject.affected ?? 0) } };
      reply = outcome.reply;
      legacy = {
        ok: true, matchValue: String(outcome.subject.merchantPattern), targetCategory: outcome.subject.targetCategory,
        targetSubcategory: outcome.subject.targetSubcategory, matchCount: Number(outcome.subject.affected ?? 0),
        proposal: { kind: 'action', action: outcome.action, subject: outcome.subject },
      };
    } else {
      receipt = { ...base, state: 'failed', reason: outcome.reason };
      reply = outcome.reply;
      legacy = { ok: false, error: outcome.reason };
    }
  } else {
    // cancel_proposal: nothing is executed.
    legacy = { ok: true };
    if (pending) {
      receipt = { v: 1, employee: 'tag-ai', action: pending.receipt.action, state: 'cancelled', subject: pending.receipt.subject, proposalRef: pending.replyTo };
      reply = "Okay, I won't change anything.";
    } else {
      receipt = { v: 1, employee: 'tag-ai', action: TAG_ACTION, state: 'cancelled', reason: 'no_pending_proposal' };
      reply = "There's nothing waiting for your confirmation, so nothing has changed.";
    }
  }

  // Prime HQ's authoritative-outcome fields (tool, success, count) on executed / attempted actions.
  if (receipt.state === 'completed' || ((intent === 'commit' || intent === 'commit_single' || intent === 'commit_proposal') && receipt.state === 'failed')) {
    receipt = { ...receipt, tool: actionName, success: receipt.state === 'completed', count: receipt.result?.affectedCount ?? 0 };
  }

  // 5. Store Tag's reply with the receipt. `persisted` is true only when claim AND reply were saved.
  let persisted = false;
  if (sessionId && claimed) {
    try {
      await completeConversationTurn(supabase, {
        sessionId, userId, employeeSlug: 'tag-ai', assistantText: reply, clientMessageId: convo.clientMessageId,
        assistantMetadata: { actionReceipt: receipt },
      });
      persisted = true;
    } catch {
      console.warn('[tag-action] conversation reply was not saved');
    }
  }

  safeLog('tag-action.conversation', { userId, intent, state: receipt.state, executed, persisted });
  return ok({ ...legacy, intent, executed, conversation: { sessionId, persisted, duplicate: false, reply, receipt } });
}

// Non-blocking audit log. Supabase query builders have NO .catch(): the old
// `insert(...).catch(() => {})` threw a TypeError after the transaction update had already
// succeeded, so fix_type / fix_type_bulk / bulk_normalize_subcategory returned 500 for completed
// changes and never wrote the log. A failed log write must never fail the customer's action.
async function logTagActivity(supabase: SupabaseClient, row: Record<string, unknown>): Promise<void> {
  try {
    const { error } = await supabase.from('tag_activity_log').insert(row);
    if (error) console.warn('[tag-action] activity log write failed');
  } catch {
    console.warn('[tag-action] activity log write failed');
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') return err('Method not allowed', 405);

  const auth = await verifyAuth(event);
  if (!auth.userId) return err('Unauthorized', 401);
  const userId = auth.userId;
  const supabase: SupabaseClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}` } },
    }
  );

  const body = JSON.parse(event.body || '{}');
  const { intent, matchValue, targetCategory, matchType = 'contains', importId } = body;

  if (!intent) return err('Missing intent (preview | commit | save_rule | undo | bulk_apply | fix_type | fix_type_bulk | bulk_normalize_subcategory)');

  // ── BULK_APPLY (INTERIM, owner GO 2026-11-25) ──────────────────────────────
  // Bulk changes must go through the signed proposal (propose_import_suggestions → commit_proposal).
  // Until the Upload page's "Apply all" moves over (Attachments HQ), this legacy entry is hardened:
  // only unprotected gap rows of the caller's own account, real categories only (no invented / silent
  // "Other"), the protection re-checked inside the update, the VERIFIED count reported, and recorded.
  if (intent === 'bulk_apply') {
    const { groups } = body;
    if (!Array.isArray(groups)) return err('Missing groups array');
    let total = 0;
    let skippedProtected = 0;
    for (const group of groups.slice(0, 200)) {
      if (!Array.isArray(group?.ids) || !group.category) continue;
      const resolved = resolveCategoryRequest(String(group.category));
      if (resolved.status !== 'exact') continue;
      const ids = group.ids.map(String).slice(0, 1000);
      const { data: current } = await supabase.from('transactions').select('id, category, category_source').in('id', ids).eq('user_id', userId);
      const writable = (current ?? []).filter((r: { category: string | null; category_source: string | null }) => isAutoWritable(r)).map((r: { id: string }) => String(r.id));
      skippedProtected += ids.length - writable.length;
      if (writable.length === 0) continue;
      const updatePayload: Record<string, unknown> = { category: resolved.category, category_source: 'tag_rule', updated_at: new Date().toISOString() };
      const sub = group.subcategory ? String(group.subcategory) : resolved.subcategory;
      if (sub) { updatePayload.subcategory = sub; updatePayload.subcategory_source = 'tag_rule'; }
      const { data: done, error } = await supabase.from('transactions').update(updatePayload)
        .in('id', writable).eq('user_id', userId)
        .or(AUTO_UPDATE_CATEGORY_FILTER).or(AUTO_UPDATE_SOURCE_FILTER)
        .select('id');
      if (!error && Array.isArray(done)) total += done.length;
    }
    if (total > 0) {
      await logTagActivity(supabase, { user_id: userId, action_type: 'bulk_apply_legacy', merchant_name: null, old_value: null, new_value: null, note: `Applied ${total} suggestions (legacy button; protected rows skipped: ${skippedProtected})`, created_at: new Date().toISOString() });
    }
    return ok({ ok: true, intent: 'bulk_apply', applied: total, skippedProtected });
  }

  // ── UNDO / FIX_TYPE_BULK / BULK_NORMALIZE_SUBCATEGORY: RETIRED (owner GO 2026-11-25) ──
  // Bulk changes with no proposal or confirmation; none is reachable from the app (undo was only
  // called from a dead panel handler; the other two have no caller). Single-transaction fix_type
  // (ordinary manual editing in the drawer) stays.
  if (intent === 'undo' || intent === 'fix_type_bulk' || intent === 'bulk_normalize_subcategory') {
    return err('This bulk action was retired. Bulk changes are proposed by Tag and need your confirmation.', 410);
  }

  // ── FIX_TYPE (single transaction) ─────────────────────────────────────────
  if (intent === 'fix_type') {
    const { transactionId, newType } = body;
    if (!transactionId) return err('Missing transactionId');
    if (!['income', 'expense'].includes(newType)) return err('newType must be "income" or "expense"');
    try {
      const { data: current } = await supabase
        .from('transactions')
        .select('type, merchant_name, amount, category')
        .eq('id', transactionId)
        .eq('user_id', userId)
        .single();

      const oldType = (current?.type || 'expense').toLowerCase();

      const updatePayload: Record<string, any> = {
        type: newType,
        updated_at: new Date().toISOString(),
      };
      if (newType === 'income') {
        updatePayload.category = 'Income';
        updatePayload.category_source = 'user_type_fix';
      }
      const { error } = await supabase
        .from('transactions')
        .update(updatePayload)
        .eq('id', transactionId)
        .eq('user_id', userId);
      if (error) return err(error.message, 500);

      await logTagActivity(supabase, {
        user_id: userId,
        action_type: 'type_fix',
        merchant_name: current?.merchant_name || null,
        transaction_id: transactionId,
        old_value: oldType,
        new_value: newType,
        note: `Type changed: ${oldType} → ${newType}${newType === 'income' ? ' (category set to Income)' : ''}`,
        created_at: new Date().toISOString(),
      });

      safeLog('tag-action.fix_type', { userId, transactionId, oldType, newType });
      return ok({ ok: true, intent: 'fix_type', transactionId, oldType, newType });
    } catch (e: any) {
      return err(e.message, 500);
    }
  }

  // ── T-H1b: conversational turns (server-composed replies and receipts) ─────
  const conversation = body.conversation !== undefined ? parseConversationFields(body.conversation) : null;
  if (body.conversation !== undefined && !conversation) return err('conversation.customerText is required');
  if (intent === 'cancel_proposal') {
    if (!conversation) return err('cancel_proposal requires conversation');
    return handleConversationalAction(supabase, userId, 'cancel_proposal', conversation, { subject: null });
  }

  // ── Owner GO 2026-11-25: "Apply suggestions" as a signed proposal (conversation required) ──
  if (intent === 'propose_import_suggestions') {
    if (!conversation) return err('propose_import_suggestions requires conversation');
    const importIdIn = typeof body.importId === 'string' ? body.importId.trim() : '';
    if (!importIdIn) return err('Missing importId');
    return handleConversationalAction(supabase, userId, 'propose_import_suggestions', conversation, { subject: null, suggestions: { importId: importIdIn } });
  }

  // ── T-ACT-SAFE: confirm a rule / bulk move / rename proposal (conversation required) ──
  if (intent === 'commit_proposal') {
    if (!conversation) return err('commit_proposal requires conversation');
    const action = typeof body.action === 'string' ? body.action : '';
    if (!TAG_PROPOSAL_ACTIONS.includes(action)) return err('Unknown proposal action');
    const raw = body.subject && typeof body.subject === 'object' && !Array.isArray(body.subject) ? body.subject as Record<string, unknown> : null;
    if (!raw) return err('Missing subject');
    const subject: ProposalSubject = {};
    for (const [k, v] of Object.entries(raw).slice(0, 20)) {
      if (typeof v === 'string' || typeof v === 'number' || v === null) subject[k] = typeof v === 'string' ? v.slice(0, 200) : v;
    }
    return handleConversationalAction(supabase, userId, 'commit_proposal', conversation, { subject: null, generic: { action, subject } });
  }

  // ── T-LIVE-02: single focused transaction (proposal → confirmation), conversation required ──
  if (intent === 'preview_single' || intent === 'commit_single') {
    if (!conversation) return err(`${intent} requires conversation`);
    const transactionId = typeof body.transactionId === 'string' ? body.transactionId.trim() : '';
    if (!UUID_RE.test(transactionId)) return err('Missing or invalid transactionId');
    if (intent === 'preview_single') {
      const targetPhrase = typeof body.targetPhrase === 'string' ? body.targetPhrase.trim().slice(0, 120) : '';
      if (!targetPhrase) return err('Missing targetPhrase');
      return handleConversationalAction(supabase, userId, 'preview_single', conversation, { subject: null, single: { transactionId, targetPhrase } });
    }
    const targetCategory = typeof body.targetCategory === 'string' ? body.targetCategory : '';
    if (!targetCategory) return err('Missing targetCategory');
    const targetSubcategory = typeof body.targetSubcategory === 'string' && body.targetSubcategory.trim() ? body.targetSubcategory.trim() : null;
    return handleConversationalAction(supabase, userId, 'commit_single', conversation, { subject: null, single: { transactionId, targetCategory, targetSubcategory } });
  }

  // ── Remaining intents require matchValue + targetCategory ─────────────────
  if (!matchValue || !targetCategory) return err('Missing matchValue or targetCategory');
  const parsedTargetRaw = parseCategoryInput(String(targetCategory));
  const parsedTarget = {
    category: normalizeCanonicalCategory(parsedTargetRaw.category),
    subcategory: parsedTargetRaw.subcategory,
  };

  const normalized = matchValue.trim().toUpperCase();

  // T-ACT-FINAL: one action safety contract. The legacy merchant commit (with or without a
  // conversation, with a client-supplied id list) is closed: every change is confirmed through
  // commit_proposal / commit_single against a server-signed proposal.
  if (intent === 'commit') {
    return err('This confirmation path was retired. Preview with a conversation and confirm the proposal with commit_proposal.', 410);
  }
  if (conversation && intent === 'preview') {
    return handleConversationalAction(supabase, userId, 'preview', conversation, {
      subject: null, typed: { matchValue: String(matchValue).trim().slice(0, 80), targetCategory: String(targetCategory).trim().slice(0, 120), matchType: matchType === 'exact' ? 'exact' : 'contains' },
    });
  }

  // ── PREVIEW ────────────────────────────────────────────────────────────────
  if (intent === 'preview') {
    try {
      const matching = await runPreview(supabase, userId, { normalized, matchType: String(matchType), importId });
      const samples = matching.slice(0, 5).map((tx) => ({
        id: tx.id, merchant_name: tx.merchant_name, amount: tx.amount,
        posted_at: tx.posted_at, current_category: tx.category || 'Uncategorized',
      }));
      return ok({
        ok: true, intent: 'preview', matchValue: normalized,
        targetCategory: parsedTarget.category, targetSubcategory: parsedTarget.subcategory,
        matchType, matchCount: matching.length, samples,
        affectedIds: matching.map((tx) => tx.id),
      });
    } catch (e: any) {
      return err(e.message, 500);
    }
  }

  // ── SAVE_RULE ──────────────────────────────────────────────────────────────
  if (intent === 'save_rule') {
    // T-ACT-FINAL: an explicit "Save rule" button saves a rule for FUTURE imports only. It used to
    // rewrite every matching existing transaction (customer-confirmed ones included) without showing a
    // count — a silent historical recategorization. Existing transactions change only through a
    // proposal the customer confirms. An unrecognised category is refused (never silently "Other").
    const resolved = resolveCategoryRequest(String(targetCategory));
    if (resolved.status !== 'exact' && resolved.status !== 'closest') return err('Unknown category: choose one of the available categories', 400);
    parsedTarget.category = resolved.category;
    if (resolved.subcategory) parsedTarget.subcategory = resolved.subcategory;
    try {
      const ruleSubcategory = body.targetSubcategory ?? body.subcategory ?? parsedTarget.subcategory ?? null;
      const ruleAmountMin = body.amount_min ?? null;
      const ruleAmountMax = body.amount_max ?? null;

      const { error: ruleErr } = await supabase.from('category_rules').upsert(
        {
          user_id: userId, match_type: matchType, merchant_pattern: normalized, match_value: normalized,
          category: parsedTarget.category, subcategory: ruleSubcategory,
          ...(ruleAmountMin != null ? { amount_min: ruleAmountMin, min_amount: ruleAmountMin } : {}),
          ...(ruleAmountMax != null ? { amount_max: ruleAmountMax, max_amount: ruleAmountMax } : {}),
          is_active: true, updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,merchant_pattern' }
      );
      if (ruleErr) {
        console.error('[tag-action] save_rule upsert failed', ruleErr.message);
        return err(`Could not save rule: ${ruleErr.message}`, 500);
      }

      // No backfill: existing transactions are not changed by saving a rule (owner rule, T-ACT-FINAL).
      const backfillCount = 0;

      const { error: vcmError } = await supabase.from('vendor_category_memory').upsert(
        {
          user_id: userId, vendor_key: normalized.toLowerCase(),
          category: parsedTarget.category, subcategory: parsedTarget.subcategory,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,vendor_key' }
      );
      if (vcmError) {
        console.error('[tag-action.save_rule] vendor_category_memory upsert failed:', vcmError.message);
      }

      safeLog('tag-action.save_rule', { userId, matchValue: normalized, targetCategory: parsedTarget.category, matchType });
      await logTagActivity(supabase, {
        user_id: userId, action_type: 'save_merchant_rule', merchant_name: normalized, old_value: null,
        new_value: parsedTarget.subcategory ? `${parsedTarget.category} / ${parsedTarget.subcategory}` : parsedTarget.category,
        note: 'Rule saved from a customer button (future imports only; existing transactions unchanged)',
        created_at: new Date().toISOString(),
      });

      return ok({ ok: true, intent: 'save_rule', rule: { merchant: normalized, category: parsedTarget.category }, backfill_count: backfillCount, existingTransactionsChanged: 0 });
    } catch (e: any) {
      return err(e.message, 500);
    }
  }

  return err(`Unknown intent: ${intent}`);
};
