/**
 * 🔄 Guardrails Compatibility Adapter
 * 
 * Bridges v2's guardrails API to v3's expected format.
 * 
 * MAPPING:
 * - v2: runGuardrails(masked, userId, 'chat', guardrailConfig) → Outcome
 * - v3: runGuardrailsCompat(reqCtx) → {allowed: boolean; reason?: string}
 * 
 * @module guardrails_adapter
 */

import { runGuardrails, getGuardrailConfig, type GuardrailConfig } from './guardrails-production';

/**
 * Request context for guardrails compatibility check
 */
export type GuardrailRequestContext = {
  /** Masked text (already PII-redacted) */
  text: string;
  /** User ID */
  userId: string;
  /** Stage: 'chat', 'ingestion_email', or 'ingestion_ocr' */
  stage?: 'chat' | 'ingestion_email' | 'ingestion_ocr';
  /** Optional guardrail config (will load from DB if not provided) */
  config?: GuardrailConfig;
};

/**
 * Guardrails compatibility result
 */
export type GuardrailCompatResult = {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Reason for blocking (if allowed=false) */
  reason?: string;
  /** Original guardrails outcome (for detailed logging) */
  outcome?: {
    ok: boolean;
    text: string;
    reasons: string[];
    block_message?: string;
    signals: any;
  };
};

/**
 * Run guardrails check with v3-compatible output format
 * 
 * This adapter wraps v2's runGuardrails() function and normalizes
 * the output to match v3's expectations:
 * - allowed: true/false (maps from outcome.ok)
 * - reason: string (maps from outcome.block_message or reasons)
 * 
 * @param reqCtx Request context with masked text and user ID
 * @returns Compatibility result with allowed flag and optional reason
 * 
 * @example
 * ```typescript
 * const result = await runGuardrailsCompat({
 *   text: maskedUserInput,
 *   userId: 'user_123',
 *   stage: 'chat'
 * });
 * 
 * if (!result.allowed) {
 *   return { statusCode: 403, body: result.reason };
 * }
 * ```
 */
export async function runGuardrailsCompat(
  reqCtx: GuardrailRequestContext
): Promise<GuardrailCompatResult> {
  const { text, userId, stage = 'chat', config } = reqCtx;

  // Load config if not provided
  let guardrailConfig: GuardrailConfig;
  if (config) {
    guardrailConfig = config;
  } else {
    // Load from database (default: strict preset)
    guardrailConfig = await getGuardrailConfig(userId);
  }

  // Run v2 guardrails
  const outcome = await runGuardrails(text, userId, stage, guardrailConfig);

  // Normalize to v3 format
  return {
    allowed: outcome.ok,
    reason: outcome.ok ? undefined : (outcome.block_message || outcome.reasons.join('; ')),
    outcome: {
      ok: outcome.ok,
      text: outcome.text,
      reasons: outcome.reasons,
      block_message: outcome.block_message,
      signals: outcome.signals
    }
  };
}

