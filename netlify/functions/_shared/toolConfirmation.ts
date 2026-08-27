/**
 * Server-enforced AI tool confirmation gate.
 *
 * Tools flagged requiresConfirm / mutates / costly cannot execute until the
 * authenticated user explicitly approves via a signed, time-bound,
 * exactly-once confirmation token stored in Supabase.
 *
 * Security properties:
 *  - Token = HMAC-SHA256 over (confirmationId, userId, sessionId, toolName, argsHash, expiry)
 *  - Model never sees the signing secret
 *  - Constant-time signature comparison (timingSafeEqual)
 *  - Atomic consume via Postgres UPDATE ... WHERE status='pending' AND expires_at > now()
 *  - Cross-user, cross-session, altered-args, expired, and replayed tokens all fail
 */

import { createHmac, createHash, timingSafeEqual, randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

// ── Configuration ──────────────────────────────────────────────────────────

const CONFIRMATION_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getSigningSecret(): string {
  const secret = process.env.TOOL_CONFIRM_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'TOOL_CONFIRM_SECRET must be set and at least 32 characters. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
    );
  }
  return secret;
}

// ── Canonical args hashing ─────────────────────────────────────────────────

/**
 * Deterministic JSON serialization: sorted keys at every depth.
 * Ensures semantically identical arguments always produce the same hash,
 * regardless of key insertion order in the original object.
 */
function canonicalStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return JSON.stringify(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalStringify).join(',') + ']';
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const pairs = keys.map(
      k => JSON.stringify(k) + ':' + canonicalStringify((value as Record<string, unknown>)[k])
    );
    return '{' + pairs.join(',') + '}';
  }
  return JSON.stringify(value);
}

export function hashArgs(args: unknown): string {
  return createHash('sha256').update(canonicalStringify(args)).digest('hex');
}

// ── HMAC token ─────────────────────────────────────────────────────────────

function signToken(
  confirmationId: string,
  userId: string,
  sessionId: string,
  toolName: string,
  argsHash: string,
  expiresAt: number, // epoch ms
): string {
  const payload = `${confirmationId}:${userId}:${sessionId}:${toolName}:${argsHash}:${expiresAt}`;
  return createHmac('sha256', getSigningSecret()).update(payload).digest('hex');
}

export function verifySignature(
  token: string,
  confirmationId: string,
  userId: string,
  sessionId: string,
  toolName: string,
  argsHash: string,
  expiresAt: number,
): boolean {
  const expected = signToken(confirmationId, userId, sessionId, toolName, argsHash, expiresAt);
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'));
}

// ── Tool gating policy ─────────────────────────────────────────────────────

export interface ToolMeta {
  requiresConfirm?: boolean;
  mutates?: boolean;
  costly?: boolean;
}

/**
 * Mirrors kernel.ts safety policy exactly:
 * gate when requiresConfirm OR mutates OR costly.
 */
export function requiresConfirmation(meta: ToolMeta): boolean {
  return !!(meta.requiresConfirm || meta.mutates || meta.costly);
}

// ── Create pending confirmation ────────────────────────────────────────────

export interface PendingConfirmationRecord {
  confirmationId: string;
  token: string;
  expiresAt: number; // epoch ms
  argsHash: string;
}

export async function createPendingConfirmation(
  sb: SupabaseClient,
  userId: string,
  sessionId: string,
  toolName: string,
  args: unknown,
): Promise<PendingConfirmationRecord> {
  const confirmationId = randomUUID();
  const argsHash = hashArgs(args);
  const expiresAt = Date.now() + CONFIRMATION_TTL_MS;
  const expiresAtISO = new Date(expiresAt).toISOString();

  const token = signToken(confirmationId, userId, sessionId, toolName, argsHash, expiresAt);

  const { error } = await sb.from('tool_confirmation_requests').insert({
    id: confirmationId,
    user_id: userId,
    session_id: sessionId,
    tool_name: toolName,
    args_hash: argsHash,
    args_snapshot: args,
    status: 'pending',
    expires_at: expiresAtISO,
  });

  if (error) {
    console.error('[toolConfirmation] Failed to create pending confirmation:', error);
    throw new Error(`Failed to create confirmation: ${error.message}`);
  }

  return { confirmationId, token, expiresAt, argsHash };
}

// ── Consume confirmation ───────────────────────────────────────────────────

export interface ConsumeResult {
  ok: true;
  confirmationId: string;
  argsSnapshot: unknown;
}

export interface ConsumeError {
  ok: false;
  reason: string;
}

export async function consumeConfirmation(
  sb: SupabaseClient,
  params: {
    confirmationId: string;
    token: string;
    expiresAt: number; // epoch ms — from the token payload sent by frontend
    userId: string;
    sessionId: string;
    toolName: string;
    argsHash: string;
  },
): Promise<ConsumeResult | ConsumeError> {
  // 1. Verify HMAC signature first (cheap, no DB hit on forgery)
  const sigValid = verifySignature(
    params.token,
    params.confirmationId,
    params.userId,
    params.sessionId,
    params.toolName,
    params.argsHash,
    params.expiresAt,
  );
  if (!sigValid) {
    console.warn('[toolConfirmation] Signature verification failed', {
      confirmationId: params.confirmationId,
      userId: params.userId?.slice(0, 8),
      toolName: params.toolName,
    });
    return { ok: false, reason: 'invalid_signature' };
  }

  // 2. Check expiry locally before hitting DB
  if (Date.now() > params.expiresAt) {
    return { ok: false, reason: 'expired' };
  }

  // 3. Atomic consume via RPC — returns empty set on any mismatch
  const { data, error } = await sb.rpc('consume_tool_confirmation', {
    p_confirmation_id: params.confirmationId,
    p_user_id: params.userId,
    p_session_id: params.sessionId,
    p_tool_name: params.toolName,
    p_args_hash: params.argsHash,
  });

  if (error) {
    console.error('[toolConfirmation] RPC error:', error);
    return { ok: false, reason: 'rpc_error' };
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    // Already consumed, expired at DB level, wrong user/session/tool/args
    return { ok: false, reason: 'not_found_or_already_consumed' };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    ok: true,
    confirmationId: row.id,
    argsSnapshot: row.args_snapshot,
  };
}
